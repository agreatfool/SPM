import * as LibFs from "mz/fs";
import * as LibPath from "path";
import * as program from "commander";
import * as unzip from "unzip";
import * as _ from "underscore";
import * as recursive from "recursive-readdir";
import {Spm, SpmPackageRequest, mkdir, rmdir, SpmPackageMap, SpmPackage, SpmPackageConfig} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:install');

program.version(pkg.version)
    .option('-i, --import <dir>', 'directory of source proto files for update spm.json')
    .option('-n, --pkgName <item>', 'package name')
    .option('-p, --projectDir <dir>', 'project dir')
    .parse(process.argv);

const PKG_NAME_VALUE = (program as any).pkgName === undefined ? undefined : (program as any).pkgName;
const IMPORT_DIR = (program as any).import === undefined ? undefined : LibPath.normalize((program as any).import);
const PROJECT_DIR_VALUE = (program as any).projectDir === undefined ? undefined : (program as any).projectDir;

class InstallCLI {
    private _tmpDir: string;
    private _tmpFileName: string;

    private _projectDir: string;
    private _spmPackageInstallDir: string;
    private _spmPackageInstalledMap: SpmPackageMap;

    static instance() {
        return new InstallCLI();
    }

    public async run() {
        debug('InstallCLI start.');
        await this._validate();
        await this._prepare();
        await this._install();
    }

    private async _validate() {
        debug('InstallCLI validate.');

        if (!IMPORT_DIR) {
            throw new Error('--import is required');
        }

        if (!LibFs.statSync(IMPORT_DIR).isDirectory()) {
            throw new Error('--import is not a directory');
        }
    }

    private async _prepare() {
        debug('InstallCLI prepare.');

        this._tmpDir = LibPath.join(Spm.SPM_ROOT_PATH, 'tmp');
        this._tmpFileName = Math.random().toString(16) + ".zip";
        await mkdir(this._tmpDir);

        if (!PROJECT_DIR_VALUE) {
            this._projectDir = Spm.getProjectDir();
        } else {
            this._projectDir = PROJECT_DIR_VALUE;
        }

        this._spmPackageInstallDir = LibPath.join(this._projectDir, Spm.INSTALL_DIR_NAME);
        await mkdir(this._spmPackageInstallDir);
        this._spmPackageInstalledMap = await Spm.getInstalledSpmPackageMap(this._spmPackageInstallDir, this._spmPackageInstallDir);
    }

    private async _install() {
        let packageList = [] as Array<string>;
        if (!PKG_NAME_VALUE) {
            // MODE ONE: npm install -i {importName}
            let importConfigPath = LibPath.join(IMPORT_DIR, 'spm.json');
            try {
                let packageConfig = Spm.getSpmPackageConfig(importConfigPath);
                for (let name in packageConfig.dependencies) {
                    packageList.push(`${name}@${packageConfig.dependencies[name]}`);
                }
            } catch (e) {
                console.log(`Error: ${importConfigPath} not found.`);
            }
        } else {
            // MODE TWO: npm install -i {importName} -n ${pkgName}
            packageList.push(PKG_NAME_VALUE);
        }

        for (let pkgName of packageList) {
            await new Promise(async (resolve) => {
                const debug = require('debug')(`SPM:CLI:install:` + pkgName);
                debug('-----------------------------------');
                let spmPackageDependMap = await this._request(debug, pkgName);
                let [mainSpmPackage, spmPackageInstallMap] = await this._comparison(debug, spmPackageDependMap, {});
                await this._update(debug, mainSpmPackage);
                await this._deploy(spmPackageInstallMap);
                debug('-----------------------------------');
                resolve();
            });
        }
    }

    private async _request(debug, name: string): Promise<SpmPackageMap | {}> {
        debug("request");

        return new Promise((resolve, reject) => {
            let params = {
                name: name,
            };

            SpmPackageRequest.postRequest('/v1/depend', params, (chunk) => {
                try {
                    let response = SpmPackageRequest.parseResponse(chunk) as SpmPackageMap;
                    resolve(response);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    private async _comparison(debug: any, spmPackageDependMap: SpmPackageMap, spmPackageInstallMap: SpmPackageMap): Promise<any> {
        return new Promise((resolve) => {
            debug('comparison.');

            let mainSpmPackage: SpmPackage;
            for (let fullName in spmPackageDependMap) {
                let spmPackageDepend = spmPackageDependMap[fullName];

                if (spmPackageDepend.isDependencies == false) {
                    mainSpmPackage = spmPackageDepend;
                }

                spmPackageInstallMap = this._comparisonWillInstall(spmPackageDepend, spmPackageInstallMap);
            }

            for (let dirname in spmPackageInstallMap) {
                let spmPackage = spmPackageInstallMap[dirname];
                spmPackage.dependenciesChanged = {};
                for (let pkgName in spmPackage.dependencies) {
                    let [dependMajor] = spmPackage.dependencies[pkgName].split('.');
                    if (this._spmPackageInstalledMap.hasOwnProperty(pkgName)) {
                        let [installMajor] = this._spmPackageInstalledMap[pkgName].version.split('.');
                        if (installMajor != dependMajor) {
                            spmPackage.dependenciesChanged[pkgName] = `${pkgName}${Spm.SPM_VERSION_CONNECTOR}${dependMajor}`;
                        }
                    }
                }
                spmPackageInstallMap[dirname] = spmPackage;
            }

            resolve([mainSpmPackage, spmPackageInstallMap]);
        });

    }

    private async _update(debug: any, mainSpmPackage: SpmPackage) {
        return new Promise(async (resolve) => {
            debug('update.');

            let importConfigPath = LibPath.join(IMPORT_DIR, 'spm.json');

            // change import package spm.json
            let packageConfig = {} as SpmPackageConfig;

            try {
                packageConfig = Spm.getSpmPackageConfig(importConfigPath);
            } catch (e) {
                debug("Error:" + e.message);
                packageConfig = {
                    name: LibPath.basename(IMPORT_DIR),
                    version: "0.0.0",
                    dependencies: {}
                };
            }

            if (packageConfig.dependencies.hasOwnProperty(mainSpmPackage.name) && packageConfig.dependencies[mainSpmPackage.name] == mainSpmPackage.version) {
                resolve();
                return;
            }

            if (!_.isEmpty(mainSpmPackage)) {
                packageConfig.dependencies[mainSpmPackage.name] = mainSpmPackage.version;
            }

            await LibFs.writeFile(importConfigPath, Buffer.from(JSON.stringify(packageConfig, null, 2)), (err) => {
                if (err) {
                    throw err;
                }

                resolve();
            });
        });
    }

    private async _deploy(spmPackageInstallMap: SpmPackageMap) {

        for (let dirname in spmPackageInstallMap) {
            const debug = require('debug')(`SPM:CLI:deploy:` + dirname);
            debug('start');

            let tmpName = dirname + this._tmpFileName;
            let tmpZipPath = LibPath.join(this._tmpDir, tmpName);
            let tmpPkgPath = LibPath.join(this._tmpDir, dirname);

            // download file
            await this._packageDownload(debug, spmPackageInstallMap[dirname], tmpZipPath);
            await this._packageUncompress(debug, tmpZipPath, tmpPkgPath);
            await this._packageReplaceName(debug, dirname, spmPackageInstallMap[dirname], tmpPkgPath);
            await this._packageCopy(debug, dirname, tmpPkgPath);

            debug('end');
        }
    }

    private _packageDownload(debug: any, spmPackage: SpmPackage, tmpZipPath: string): Promise<SpmPackageMap | {}> {

        return new Promise((resolve, reject) => {
            debug('download.');

            let params = {
                path: spmPackage.downloadUrl,
            };

            let fileStream = LibFs.createWriteStream(tmpZipPath);
            SpmPackageRequest.postRequest('/v1/install', params, null, (res) => {
                if (res.headers['content-type'] == 'application/octet-stream') {
                    res.pipe(fileStream);
                    res.on("end", () => {
                        debug('download finish. ' + tmpZipPath);
                        resolve();
                    });
                } else {
                    res.on("data", (chunk) => reject(new Error(chunk.toString())));
                }
            });
        });
    }

    private _packageUncompress(debug: any, tmpZipPath: string, tmpPkgPath: string): Promise<SpmPackageMap | {}> {

        return new Promise((resolve, reject) => {
            debug('uncompress.');
            if (LibFs.statSync(tmpZipPath).isFile()) {
                LibFs.createReadStream(tmpZipPath).pipe(unzip.Extract({path: tmpPkgPath})
                    .on("close", () => {
                        debug('uncompress finish.');
                        LibFs.unlinkSync(tmpZipPath);
                        resolve();
                    }));
            } else {
                LibFs.unlinkSync(tmpZipPath);
                reject(new Error("Download file corruption."));
            }
        });
    }

    private _packageReplaceName(debug: any, dirname: string, spmPackage: SpmPackage, tmpPkgPath: string): Promise<SpmPackageMap | {}> {

        return new Promise(async (resolve, reject) => {
            debug('replace name.');

            if (_.isEmpty(spmPackage.dependenciesChanged) && spmPackage.name == dirname) {
                resolve();
            } else {

                try {
                    let files = await recursive(tmpPkgPath, ['.DS_Store']);
                    let count = 0;
                    files.map((file: string) => {
                        count++;
                        if (LibPath.basename(file).match(/.+\.proto/) !== null) {
                            if (spmPackage.name != dirname) {
                                Spm._replaceStringInFile(file, [
                                    [new RegExp(`package ${spmPackage.name};`, "g"), `package ${dirname};`]
                                ]);
                            }

                            for (let oldString in spmPackage.dependenciesChanged) {
                                let newString = spmPackage.dependenciesChanged[oldString];
                                Spm._replaceStringInFile(file, [
                                    [new RegExp(`import "${oldString}/`, "g"), `import "${newString}/`],
                                    [new RegExp(`\\((${oldString}.*?)\\)`, "g"), (word) => word.replace(oldString, newString)],
                                    [new RegExp(` (${oldString}.*?) `, "g"), (word) => word.replace(oldString, newString)]
                                ]);
                            }
                        }

                        if (count == files.length) {
                            debug('replace name finish.');
                            resolve();
                        }
                    });
                } catch (e) {
                    reject(e);
                }

            }
        });
    }

    private _packageCopy(debug: any, dirname: string, tmpPkgPath: string): Promise<SpmPackageMap | {}> {

        return new Promise(async (resolve) => {
            debug('copy.');
            let packageDir = LibPath.join(this._spmPackageInstallDir, dirname);

            if (LibFs.existsSync(packageDir) && LibFs.statSync(packageDir).isDirectory()) {
                await rmdir(packageDir);
            }

            await LibFs.rename(tmpPkgPath, packageDir);
            debug('copy finish.');
            resolve();
        });

    }

    private _comparisonWillInstall(spmPackage: SpmPackage, spmPackageInstallMap: SpmPackageMap, deepLevel: number = 0, changeName?: string) {
        let dirname = (changeName) ? changeName : spmPackage.name;
        if (this._spmPackageInstalledMap.hasOwnProperty(dirname)) {
            let [nextMajor, nextMinor, nextPatch] = spmPackage.version.split('.');
            let [curMajor, curMinor, curPath] = this._spmPackageInstalledMap[dirname].version.split('.');

            if (nextMajor == curMajor) {
                if (nextMinor < curMinor || nextMinor == curMinor && nextPatch < curPath) {
                    // 依赖版本低于当前版本，不处理，其他情况都要重新下载
                } else {
                    this._spmPackageInstalledMap[dirname] = spmPackage;
                    spmPackageInstallMap[dirname] = spmPackage;
                }
            } else {
                if (deepLevel == 0) {
                    this._comparisonWillInstall(spmPackage, spmPackageInstallMap, 1, `${spmPackage.name}${Spm.SPM_VERSION_CONNECTOR}${nextMajor}`);
                }
            }
        } else {
            this._spmPackageInstalledMap[dirname] = spmPackage;
            spmPackageInstallMap[dirname] = spmPackage;
        }

        return spmPackageInstallMap;
    }
}

InstallCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
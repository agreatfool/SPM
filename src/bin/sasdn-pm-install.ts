import * as LibFs from "mz/fs";
import * as LibPath from "path";
import * as program from "commander";
import * as unzip from "unzip2";
import * as _ from "underscore";
import * as recursive from "recursive-readdir";
import {Spm, SpmPackageRequest, mkdir, rmdir, SpmPackageMap, SpmPackage, SpmPackageConfig} from "./lib/lib";
import * as request from "./lib/request";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:install');

program.version(pkg.version)
    .parse(process.argv);

const PKG_NAME_VALUE = program.args[0] === undefined ? undefined : program.args[0];

export class InstallCLI {
    private _tmpDir: string;
    private _tmpFileName: string;

    private _projectDir: string;
    private _spmPackageInstallDir: string;
    private _spmPackageInstalledMap: SpmPackageMap;
    private _downloadInstalled: Map<string, boolean>;

    static instance() {
        return new InstallCLI();
    }

    public async run() {
        debug('InstallCLI start.');
        await this._prepare();
        await this._install();
        debug('InstallCLI complete.');
        console.log("InstallCLI complete.");
    }

    private async _prepare() {
        debug('InstallCLI prepare.');

        this._tmpDir = LibPath.join(Spm.SPM_ROOT_PATH, 'tmp');
        this._tmpFileName = Math.random().toString(16) + '.zip';
        await mkdir(this._tmpDir);

        this._projectDir = Spm.getProjectDir();
        this._spmPackageInstallDir = LibPath.join(this._projectDir, Spm.INSTALL_DIR_NAME);
        await mkdir(this._spmPackageInstallDir);

        this._spmPackageInstalledMap = await Spm.getInstalledSpmPackageMap();
        this._downloadInstalled = new Map();
    }

    private async _install() {
        let packageList = [] as Array<string>;
        if (!PKG_NAME_VALUE) {
            // MODE ONE: npm install
            let importConfigPath = LibPath.join(this._projectDir, 'spm.json');
            try {
                let packageConfig = Spm.getSpmPackageConfig(importConfigPath);
                for (let name in packageConfig.dependencies) {
                    packageList.push(`${name}@${packageConfig.dependencies[name]}`);
                }
            } catch (e) {
                console.log(`Error: ${importConfigPath} not found.`);
            }
        } else {
            // MODE TWO: npm install ${pkgName}
            packageList.push(PKG_NAME_VALUE);
        }

        for (let pkgName of packageList) {
            await new Promise(async (resolve, reject) => {
                const debug = require('debug')(`SPM:CLI:install:` + pkgName);
                debug('-----------------------------------');
                try {
                    let spmPackageDependMap = await this._searchDependencies(debug, pkgName);
                    let [mainSpmPackage, spmPackageInstallMap] = await this._comparison(debug, spmPackageDependMap, {});
                    await this._update(debug, mainSpmPackage);
                    await this._deploy(spmPackageInstallMap);
                } catch (e) {
                    reject(e);
                }
                debug('-----------------------------------');
                resolve();
            });
        }
    }

    private async _searchDependencies(debug, name: string): Promise<SpmPackageMap | {}> {
        debug('search dependencies');

        return new Promise(async (resolve, reject) => {
            let params = {
                name: name,
            };

            request.post('/v1/search_dependencies', params, (chunk, reqResolve, reqReject) => {
                try {
                    reqResolve(SpmPackageRequest.parseResponse(chunk));
                } catch (e) {
                    reqReject(e);
                }
            }).then((response) => {
                resolve(response);
            }).catch((e) => {
                reject(e);
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

            let importConfigPath = LibPath.join(this._projectDir, 'spm.json');

            // change import package spm.json
            let packageConfig = {} as SpmPackageConfig;

            try {
                packageConfig = Spm.getSpmPackageConfig(importConfigPath);
            } catch (e) {
                debug(e.message);
                debug('Create File:' + importConfigPath);
                packageConfig = {
                    name: LibPath.basename(this._projectDir),
                    version: '0.0.0',
                    description: '',
                    dependencies: {}
                };
            }

            if (packageConfig.dependencies.hasOwnProperty(mainSpmPackage.name)
                && packageConfig.dependencies[mainSpmPackage.name] == mainSpmPackage.version) {
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

            const tmpName = dirname + this._tmpFileName;
            const tmpZipPath = LibPath.join(this._tmpDir, tmpName);
            const tmpPkgPath = LibPath.join(this._tmpDir, dirname);

            // download file
            const spmPackage = spmPackageInstallMap[dirname];
            const spmPackageName = `${spmPackage.name}@${spmPackage.version}`;

            if (this._downloadInstalled.get(spmPackageName) !== true) {
                await this._packageDownload(debug, spmPackageInstallMap[dirname], tmpZipPath);
                await this._packageUncompress(debug, tmpZipPath, tmpPkgPath);
                await this._packageReplaceName(debug, dirname, spmPackageInstallMap[dirname], tmpPkgPath);
                await this._packageCopy(debug, dirname, tmpPkgPath);
                this._downloadInstalled.set(spmPackageName, true);
                console.log(`Package：${spmPackageName} complete!`);
            }
        }
    }

    private _packageDownload(debug: any, spmPackage: SpmPackage, tmpZipPath: string): Promise<SpmPackageMap | {}> {

        return new Promise(async (resolve, reject) => {
            debug('download.');

            let params = {
                path: spmPackage.downloadUrl,
            };

            let fileStream = LibFs.createWriteStream(tmpZipPath);
            request.post('/v1/install', params, null, (res, reqResolve, reqReject) => {
                if (res.headers['content-type'] == 'application/octet-stream') {
                    res.pipe(fileStream);
                    res.on('end', () => {
                        reqResolve();
                    });
                } else {
                    res.on('data', (chunk) => {
                        reqReject(new Error(chunk.toString()));
                    });
                }
            }).then(() => {
                debug('download finish. ' + tmpZipPath);
                resolve();
            }).catch((e) => {
                reject(e);
            });
        });
    }

    private _packageUncompress(debug: any, tmpZipPath: string, tmpPkgPath: string): Promise<SpmPackageMap | {}> {

        return new Promise((resolve, reject) => {
            debug('uncompress.');
            if (LibFs.statSync(tmpZipPath).isFile()) {
                LibFs.createReadStream(tmpZipPath).pipe(unzip.Extract({path: tmpPkgPath})
                    .on('close', () => {
                        LibFs.unlinkSync(tmpZipPath);
                        resolve();
                    }));
            } else {
                LibFs.unlinkSync(tmpZipPath);
                reject(new Error('Download file corruption.'));
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
                                Spm.replaceStringInFile(file, [
                                    [new RegExp(`package ${spmPackage.name};`, 'g'), `package ${dirname};`]
                                ]);
                            }

                            for (let oldString in spmPackage.dependenciesChanged) {
                                let newString = spmPackage.dependenciesChanged[oldString];
                                Spm.replaceStringInFile(file, [
                                    [new RegExp(`import "${oldString}/`, 'g'), `import "${newString}/`],
                                    [new RegExp(`\\((${oldString}.*?)\\)`, 'g'), (word) => word.replace(oldString, newString)],
                                    [new RegExp(` (${oldString}.*?) `, 'g'), (word) => word.replace(oldString, newString)]
                                ]);
                            }
                        }

                        if (count == files.length) {
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
    console.log(err.message);
});
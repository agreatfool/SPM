import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import * as program from 'commander';
import * as unzip from 'unzip2';
import * as _ from 'underscore';
import * as recursive from 'recursive-readdir';
import {Spm, SpmPackageRequest, mkdir, rmdir, SpmPackageMap, SpmPackage, SpmPackageConfig} from './lib/lib';
import * as request from './lib/request';

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

const PKG_NAME_VALUE = program.args[0] === undefined ? undefined : program.args[0];

export class InstallCLI {
    private _tmpDir: string;
    private _tmpFileName: string;

    private _projectDir: string;
    private _spmPackageInstallDir: string;
    private _spmPackageInstalledMap: SpmPackageMap;
    private _spmPackageDeployedMap: Map<string, boolean>;

    static instance() {
        return new InstallCLI();
    }

    public async run() {
        console.log('InstallCLI start.');
        await this._prepare();
        await this._install();
        console.log('InstallCLI complete.');
    }

    private async _prepare() {
        console.log('InstallCLI prepare.');

        this._tmpDir = LibPath.join(Spm.SPM_ROOT_PATH, 'tmp');
        this._tmpFileName = Math.random().toString(16) + '.zip';
        await mkdir(this._tmpDir);

        this._projectDir = Spm.getProjectDir();
        this._spmPackageInstallDir = LibPath.join(this._projectDir, Spm.INSTALL_DIR_NAME);
        await mkdir(this._spmPackageInstallDir);

        this._spmPackageInstalledMap = await Spm.getInstalledSpmPackageMap();
        this._spmPackageDeployedMap = new Map();
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
                console.log('----------Proto Package Installation-----------');
                try {
                    let spmPackageDependMap = await this._searchDependencies(pkgName);
                    let [mainSpmPackage, spmPackageInstallMap] = await this._compare(spmPackageDependMap, {});
                    await this._update(mainSpmPackage);
                    await this._deploy(spmPackageInstallMap);
                } catch (e) {
                    reject(e);
                }
                console.log('----------Proto Package Installation-----------');
                resolve();
            });
        }
    }

    private async _searchDependencies(name: string): Promise<SpmPackageMap | {}> {
        console.log('Search dependencies');

        return new Promise((resolve, reject) => {
            let params = {
                name: name,
            };

            request.post('/v1/search_dependencies', params, (chunk) => {
                try {
                    resolve(SpmPackageRequest.parseResponse(chunk));
                } catch (e) {
                    reject(e);
                }
            }).catch((e) => {
                reject(e);
            });
        });
    }

    private async _compare(spmPackageDependMap: SpmPackageMap, spmPackageInstallMap: SpmPackageMap): Promise<any> {
        console.log('Compare');

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

        return Promise.resolve([mainSpmPackage, spmPackageInstallMap]);
    }

    private async _update(mainSpmPackage: SpmPackage) {
        console.log('Update');

        let importConfigPath = LibPath.join(this._projectDir, 'spm.json');

        // change import package spm.json
        let packageConfig = Spm.getSpmPackageConfig(importConfigPath) as SpmPackageConfig;

        if (packageConfig.dependencies.hasOwnProperty(mainSpmPackage.name)
            && packageConfig.dependencies[mainSpmPackage.name] == mainSpmPackage.version) {
            return Promise.resolve();
        }

        if (!_.isEmpty(mainSpmPackage)) {
            packageConfig.dependencies[mainSpmPackage.name] = mainSpmPackage.version;
        }

        await LibFs.writeFile(importConfigPath, Buffer.from(JSON.stringify(packageConfig, null, 2)));
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

            if (this._spmPackageDeployedMap.get(spmPackageName) !== true) {
                await this._packageDownload(spmPackageInstallMap[dirname], tmpZipPath);
                await this._packageUncompress(tmpZipPath, tmpPkgPath);
                await this._packageReplaceName(dirname, spmPackageInstallMap[dirname], tmpPkgPath);
                await this._packageCopy(dirname, tmpPkgPath);
                this._spmPackageDeployedMap.set(spmPackageName, true);
                console.log(`Package：${spmPackageName} complete!`);
            }
        }
    }

    private _packageDownload(spmPackage: SpmPackage, tmpZipPath: string): Promise<SpmPackageMap | {}> {

        return new Promise(async (resolve, reject) => {
            console.log('download.');

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
                console.log('download finish. ' + tmpZipPath);
                resolve();
            }).catch((e) => {
                reject(e);
            });
        });
    }

    private _packageUncompress(tmpZipPath: string, tmpPkgPath: string): Promise<SpmPackageMap | {}> {

        return new Promise((resolve, reject) => {
            console.log('uncompress.');
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

    private _packageReplaceName(dirname: string, spmPackage: SpmPackage, tmpPkgPath: string): Promise<SpmPackageMap | {}> {

        return new Promise(async (resolve, reject) => {
            console.log('replace name.');
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

    private _packageCopy(dirname: string, tmpPkgPath: string): Promise<SpmPackageMap | {}> {

        return new Promise(async (resolve) => {
            console.log('copy.');

            let packageDir = LibPath.join(this._spmPackageInstallDir, dirname);
            if (LibFs.existsSync(packageDir) && LibFs.statSync(packageDir).isDirectory()) {
                await rmdir(packageDir);
            }
            await LibFs.rename(tmpPkgPath, packageDir);

            console.log('copy finish.');
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
    console.log('error:', err.message);
});
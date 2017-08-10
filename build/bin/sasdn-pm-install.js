"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const LibFs = require("mz/fs");
const LibPath = require("path");
const program = require("commander");
const unzip = require("unzip");
const _ = require("underscore");
const recursive = require("recursive-readdir");
const lib_1 = require("./lib/lib");
const request = require("./lib/request");
const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:install');
program.version(pkg.version)
    .parse(process.argv);
const PKG_NAME_VALUE = program.args[0] === undefined ? undefined : program.args[0];
class InstallCLI {
    static instance() {
        return new InstallCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI start.');
            yield this._prepare();
            yield this._install();
        });
    }
    _prepare() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI prepare.');
            this._tmpDir = LibPath.join(lib_1.Spm.SPM_ROOT_PATH, 'tmp');
            this._tmpFileName = Math.random().toString(16) + '.zip';
            yield lib_1.mkdir(this._tmpDir);
            this._projectDir = lib_1.Spm.getProjectDir();
            this._spmPackageInstallDir = LibPath.join(this._projectDir, lib_1.Spm.INSTALL_DIR_NAME);
            yield lib_1.mkdir(this._spmPackageInstallDir);
            this._spmPackageInstalledMap = yield lib_1.Spm.getInstalledSpmPackageMap();
        });
    }
    _install() {
        return __awaiter(this, void 0, void 0, function* () {
            let packageList = [];
            if (!PKG_NAME_VALUE) {
                // MODE ONE: npm install
                let importConfigPath = LibPath.join(this._projectDir, 'spm.json');
                try {
                    let packageConfig = lib_1.Spm.getSpmPackageConfig(importConfigPath);
                    for (let name in packageConfig.dependencies) {
                        packageList.push(`${name}@${packageConfig.dependencies[name]}`);
                    }
                }
                catch (e) {
                    console.log(`Error: ${importConfigPath} not found.`);
                }
            }
            else {
                // MODE TWO: npm install ${pkgName}
                packageList.push(PKG_NAME_VALUE);
            }
            for (let pkgName of packageList) {
                yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    const debug = require('debug')(`SPM:CLI:install:` + pkgName);
                    debug('-----------------------------------');
                    try {
                        let spmPackageDependMap = yield this._searchDependencies(debug, pkgName);
                        let [mainSpmPackage, spmPackageInstallMap] = yield this._comparison(debug, spmPackageDependMap, {});
                        yield this._update(debug, mainSpmPackage);
                        yield this._deploy(spmPackageInstallMap);
                    }
                    catch (e) {
                        reject(e);
                    }
                    debug('-----------------------------------');
                    resolve();
                }));
            }
        });
    }
    _searchDependencies(debug, name) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('search dependencies');
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let params = {
                    name: name,
                };
                request.post('/v1/search_dependencies', params, (chunk, reqResolve, reqReject) => {
                    try {
                        reqResolve(lib_1.SpmPackageRequest.parseResponse(chunk));
                    }
                    catch (e) {
                        reqReject(e);
                    }
                }).then((response) => {
                    resolve(response);
                }).catch((e) => {
                    reject(e);
                });
            }));
        });
    }
    _comparison(debug, spmPackageDependMap, spmPackageInstallMap) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                debug('comparison.');
                let mainSpmPackage;
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
                                spmPackage.dependenciesChanged[pkgName] = `${pkgName}${lib_1.Spm.SPM_VERSION_CONNECTOR}${dependMajor}`;
                            }
                        }
                    }
                    spmPackageInstallMap[dirname] = spmPackage;
                }
                resolve([mainSpmPackage, spmPackageInstallMap]);
            });
        });
    }
    _update(debug, mainSpmPackage) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                debug('update.');
                let importConfigPath = LibPath.join(this._projectDir, 'spm.json');
                // change import package spm.json
                let packageConfig = {};
                try {
                    packageConfig = lib_1.Spm.getSpmPackageConfig(importConfigPath);
                }
                catch (e) {
                    debug(e.message);
                    debug('Create File:' + importConfigPath);
                    packageConfig = {
                        name: LibPath.basename(this._projectDir),
                        version: '0.0.0',
                        description: '',
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
                yield LibFs.writeFile(importConfigPath, Buffer.from(JSON.stringify(packageConfig, null, 2)), (err) => {
                    if (err) {
                        throw err;
                    }
                    resolve();
                });
            }));
        });
    }
    _deploy(spmPackageInstallMap) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let dirname in spmPackageInstallMap) {
                const debug = require('debug')(`SPM:CLI:deploy:` + dirname);
                debug('start');
                let tmpName = dirname + this._tmpFileName;
                let tmpZipPath = LibPath.join(this._tmpDir, tmpName);
                let tmpPkgPath = LibPath.join(this._tmpDir, dirname);
                // download file
                yield this._packageDownload(debug, spmPackageInstallMap[dirname], tmpZipPath);
                yield this._packageUncompress(debug, tmpZipPath, tmpPkgPath);
                yield this._packageReplaceName(debug, dirname, spmPackageInstallMap[dirname], tmpPkgPath);
                yield this._packageCopy(debug, dirname, tmpPkgPath);
                debug('end');
            }
        });
    }
    _packageDownload(debug, spmPackage, tmpZipPath) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
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
                }
                else {
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
        }));
    }
    _packageUncompress(debug, tmpZipPath, tmpPkgPath) {
        return new Promise((resolve, reject) => {
            debug('uncompress.');
            if (LibFs.statSync(tmpZipPath).isFile()) {
                LibFs.createReadStream(tmpZipPath).pipe(unzip.Extract({ path: tmpPkgPath })
                    .on('close', () => {
                    debug('uncompress finish.');
                    LibFs.unlinkSync(tmpZipPath);
                    resolve();
                }));
            }
            else {
                LibFs.unlinkSync(tmpZipPath);
                reject(new Error('Download file corruption.'));
            }
        });
    }
    _packageReplaceName(debug, dirname, spmPackage, tmpPkgPath) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            debug('replace name.');
            if (_.isEmpty(spmPackage.dependenciesChanged) && spmPackage.name == dirname) {
                resolve();
            }
            else {
                try {
                    let files = yield recursive(tmpPkgPath, ['.DS_Store']);
                    let count = 0;
                    files.map((file) => {
                        count++;
                        if (LibPath.basename(file).match(/.+\.proto/) !== null) {
                            if (spmPackage.name != dirname) {
                                lib_1.Spm.replaceStringInFile(file, [
                                    [new RegExp(`package ${spmPackage.name};`, 'g'), `package ${dirname};`]
                                ]);
                            }
                            for (let oldString in spmPackage.dependenciesChanged) {
                                let newString = spmPackage.dependenciesChanged[oldString];
                                lib_1.Spm.replaceStringInFile(file, [
                                    [new RegExp(`import "${oldString}/`, 'g'), `import "${newString}/`],
                                    [new RegExp(`\\((${oldString}.*?)\\)`, 'g'), (word) => word.replace(oldString, newString)],
                                    [new RegExp(` (${oldString}.*?) `, 'g'), (word) => word.replace(oldString, newString)]
                                ]);
                            }
                        }
                        if (count == files.length) {
                            debug('replace name finish.');
                            resolve();
                        }
                    });
                }
                catch (e) {
                    reject(e);
                }
            }
        }));
    }
    _packageCopy(debug, dirname, tmpPkgPath) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            debug('copy.');
            let packageDir = LibPath.join(this._spmPackageInstallDir, dirname);
            if (LibFs.existsSync(packageDir) && LibFs.statSync(packageDir).isDirectory()) {
                yield lib_1.rmdir(packageDir);
            }
            yield LibFs.rename(tmpPkgPath, packageDir);
            debug('copy finish.');
            resolve();
        }));
    }
    _comparisonWillInstall(spmPackage, spmPackageInstallMap, deepLevel = 0, changeName) {
        let dirname = (changeName) ? changeName : spmPackage.name;
        if (this._spmPackageInstalledMap.hasOwnProperty(dirname)) {
            let [nextMajor, nextMinor, nextPatch] = spmPackage.version.split('.');
            let [curMajor, curMinor, curPath] = this._spmPackageInstalledMap[dirname].version.split('.');
            if (nextMajor == curMajor) {
                if (nextMinor < curMinor || nextMinor == curMinor && nextPatch < curPath) {
                    // 依赖版本低于当前版本，不处理，其他情况都要重新下载
                }
                else {
                    this._spmPackageInstalledMap[dirname] = spmPackage;
                    spmPackageInstallMap[dirname] = spmPackage;
                }
            }
            else {
                if (deepLevel == 0) {
                    this._comparisonWillInstall(spmPackage, spmPackageInstallMap, 1, `${spmPackage.name}${lib_1.Spm.SPM_VERSION_CONNECTOR}${nextMajor}`);
                }
            }
        }
        else {
            this._spmPackageInstalledMap[dirname] = spmPackage;
            spmPackageInstallMap[dirname] = spmPackage;
        }
        return spmPackageInstallMap;
    }
}
exports.InstallCLI = InstallCLI;
InstallCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});

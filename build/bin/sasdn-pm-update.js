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
const unzip = require("unzip2");
const _ = require("underscore");
const recursive = require("recursive-readdir");
const readlineSync = require("readline-sync");
const lib_1 = require("./lib/lib");
const pkg = require('../../package.json');
program.version(pkg.version)
    .description('update proto to latest version')
    .usage('[Options] [package]')
    .parse(process.argv);
const PKG_NAME = program.args[0];
class UpdateCLI {
    static instance() {
        return new UpdateCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('UpdateCLI start.');
            yield this._prepare();
            yield this._update();
            console.log('UpdateCLI complete.');
            yield lib_1.Spm.checkVersion();
        });
    }
    /**
     * 准备命令中需要使用的参数，或创建文件夹。
     *
     * @returns {Promise<void>}
     * @private
     */
    _prepare() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('UpdateCLI prepare.');
            this._projectDir = lib_1.Spm.getProjectDir();
            this._packageConfig = lib_1.Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));
            this._packageDeployed = new Map();
            this._spmPackageInstalled = yield lib_1.Spm.getInstalledSpmPackageMap();
            this._spmPackageWillInstall = {};
            // 创建临时文件夹，生成临时文件名
            this._tmpFilePath = LibPath.join(this._projectDir, 'tmp');
            this._tmpFileName = Math.random().toString(16) + '.zip';
            yield lib_1.mkdir(this._tmpFilePath);
            // 创建依赖包文件夹
            yield lib_1.mkdir(LibPath.join(this._projectDir, lib_1.Spm.INSTALL_DIR_NAME));
        });
    }
    /**
     * 执行安装
     *
     * @returns {Promise<void>}
     * @private
     */
    _update() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!PKG_NAME) {
                // MODE ONE: npm update
                // 将依赖包的版本更新为相同 major 下的最新版本（minor 号和 patch 号最高）
                for (let packageName of Object.keys(this._packageConfig.dependencies)) {
                    let major = this._packageConfig.dependencies[packageName].split('.')[0];
                    let remoteLatestVersion = yield lib_1.HttpRequest.post('/v1/search_latest', { packageName, major });
                    this._packageConfig.dependencies[packageName] = remoteLatestVersion;
                }
            }
            else {
                // MODE TWO: npm update ${pkgName}
                if (!this._packageConfig.dependencies[PKG_NAME]) {
                    throw new Error(`${PKG_NAME} does not exist in spm.json.`);
                }
                let major = this._packageConfig.dependencies[PKG_NAME].split('.')[0];
                let remoteLatestVersion = yield lib_1.HttpRequest.post('/v1/search_latest', {
                    packageName: PKG_NAME,
                    major: major,
                });
                this._packageConfig.dependencies[PKG_NAME] = remoteLatestVersion;
            }
            // 写入依赖关系
            yield LibFs.writeFile(LibPath.join(this._projectDir, 'spm.json'), Buffer.from(JSON.stringify(this._packageConfig, null, 2)));
            let packageList = [];
            for (let name in this._packageConfig.dependencies) {
                packageList.push(`${name}@${this._packageConfig.dependencies[name]}`);
            }
            for (let pkgName of packageList) {
                let spmPackageDependMap = yield this._getPkgDependcies(pkgName);
                yield this._loopDependenciesAndCompare(spmPackageDependMap);
                yield this._handleDependenciesConflict();
                yield this._packageDeploy();
            }
            yield lib_1.rmdir(this._tmpFilePath);
        });
    }
    /**
     * 访问 /v1/search_dependencies 获取需要安装的包的依赖
     *
     * @param {string} name
     * @returns {Promise<SpmPackageMap | {}>}
     * @private
     */
    _getPkgDependcies(name) {
        return __awaiter(this, void 0, void 0, function* () {
            let params = {
                name: name,
            };
            return yield lib_1.HttpRequest.post('/v1/search_dependencies', params);
        });
    }
    /**
     * 解决“安装的包”的依赖冲突问题
     *
     * @private
     */
    _handleDependenciesConflict() {
        for (let dirname in this._spmPackageWillInstall) {
            this._spmPackageWillInstall[dirname].dependenciesChanged = {};
            for (let pkgName in this._spmPackageWillInstall[dirname].dependencies) {
                let [dependMajor] = this._spmPackageWillInstall[dirname].dependencies[pkgName].split('.');
                let [installMajor] = this._spmPackageInstalled[pkgName].version.split('.');
                // 当需要安装的包依赖已经安装，并且其版本号的主版本号与已安装的依赖不相同，则更改需要安装的包依赖的pkgName
                if (this._spmPackageInstalled.hasOwnProperty(pkgName)) {
                    if (installMajor != dependMajor) {
                        this._spmPackageWillInstall[dirname].dependenciesChanged[pkgName] = `${pkgName}${lib_1.Spm.SPM_VERSION_CONNECTOR}${dependMajor}`;
                    }
                }
            }
        }
    }
    /**
     * 遍历需要安装的包依赖，并对比版本号，确定是否需要重新安装。
     *
     * @param {SpmPackageMap} spmPackageDependMap
     * @returns {Promise<void>}
     * @private
     */
    _loopDependenciesAndCompare(spmPackageDependMap) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let fullName in spmPackageDependMap) {
                let spmPackageDepend = spmPackageDependMap[fullName];
                // 对比“依赖版本”与“当前版本”的 package 的版本。
                this._comparisonWillInstall(spmPackageDepend);
                // 修改 spm.json 的依赖关系。
                if (spmPackageDepend.isDependencies == false) {
                    // 如果当前版本已经存在，则跳过。
                    if (this._packageConfig.dependencies.hasOwnProperty(spmPackageDepend.name)
                        && this._packageConfig.dependencies[spmPackageDepend.name] == spmPackageDepend.version) {
                        continue;
                    }
                    // 写入依赖关系
                    this._packageConfig.dependencies[spmPackageDepend.name] = spmPackageDepend.version;
                    yield LibFs.writeFile(LibPath.join(this._projectDir, 'spm.json'), Buffer.from(JSON.stringify(this._packageConfig, null, 2)));
                }
            }
        });
    }
    /**
     * 对比“依赖版本”与“当前版本”的 package 的版本。
     * 1. 依赖版本 minor.patch 低于当前版本，则不处理
     * 2. 依赖版本 minor.patch 高于当前版本，则下载
     * 3. 依赖版本 major 高于当前版本，则给出警告，并询问使用者采用覆盖安装还是采用版本冲突安装方案安装
     * 4. 依赖版本 major 低于当前版本，采用版本冲突安装方案安装
     *
     * @param {SpmPackage} spmPackage
     * @param deepLevel
     * @param {string} changeName
     * @returns {SpmPackageMap}
     * @private
     */
    _comparisonWillInstall(spmPackage, deepLevel = 0, changeName) {
        let dirname = (changeName) ? changeName : spmPackage.name;
        if (this._spmPackageInstalled.hasOwnProperty(dirname)) {
            let [nextMajor, nextMinor, nextPatch] = spmPackage.version.split('.');
            let [curMajor, curMinor, curPath] = this._spmPackageInstalled[dirname].version.split('.');
            if (nextMajor == curMajor) {
                // 主版本号相同
                if (nextMinor < curMinor || nextMinor == curMinor && nextPatch <= curPath) {
                    // 依赖版本低于或等于当前版本，不处理，其他情况都要重新下载
                }
                else {
                    this._spmPackageInstalled[dirname] = spmPackage;
                    this._spmPackageWillInstall[dirname] = spmPackage;
                }
            }
            else if (nextMajor > curMajor) {
                // 依赖版本 major 高于当前版本
                console.log(`\nWarning: The version of package [${spmPackage.name}] you are going to install is [${spmPackage.version}] ` +
                    `while your local version is [${this._spmPackageInstalled[dirname].version}], which causes confict.` +
                    `If you overwrite the current package, you should change logic of some interface. If you choose [n],` +
                    `the two version will coexist and the new installed one will be renamed. ChangeLog in spm.json may be helpful.\n`);
                let flag = '';
                while (['y', 'yes', 'n', 'no'].indexOf(flag) === -1) {
                    flag = readlineSync.question(`Are you sure to overwrite the current package [${spmPackage.name}]? (y/n)`);
                }
                if (flag === 'y' || flag === 'yes') {
                    this._spmPackageInstalled[dirname] = spmPackage;
                    this._spmPackageWillInstall[dirname] = spmPackage;
                }
                else {
                    if (deepLevel === 0) {
                        this._comparisonWillInstall(spmPackage, 1, `${spmPackage.name}${lib_1.Spm.SPM_VERSION_CONNECTOR}${nextMajor}`);
                    }
                }
            }
            else {
                // 依赖版本 major 低于当前版本
                if (deepLevel === 0) {
                    this._comparisonWillInstall(spmPackage, 1, `${spmPackage.name}${lib_1.Spm.SPM_VERSION_CONNECTOR}${nextMajor}`);
                }
            }
        }
        else {
            this._spmPackageInstalled[dirname] = spmPackage;
            this._spmPackageWillInstall[dirname] = spmPackage;
        }
    }
    /**
     * 部署 package
     *
     * @returns {Promise<void>}
     * @private
     */
    _packageDeploy() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let dirname in this._spmPackageWillInstall) {
                let tmpName = dirname + this._tmpFileName;
                let tmpZipPath = LibPath.join(this._tmpFilePath, tmpName);
                let tmpPkgPath = LibPath.join(this._tmpFilePath, dirname);
                // download file
                let spmPackage = this._spmPackageWillInstall[dirname];
                let spmPackageName = `${spmPackage.name}@${spmPackage.version}`;
                if (this._packageDeployed.get(spmPackageName) !== true) {
                    yield this._packageDownload(spmPackage, tmpZipPath);
                    yield this._packageUncompress(tmpZipPath, tmpPkgPath);
                    yield this._packageReplaceName(dirname, spmPackage, tmpPkgPath);
                    yield this._packageCopy(dirname, tmpPkgPath);
                    this._packageDeployed.set(spmPackageName, true);
                    console.log(`Package：${spmPackageName} complete!`);
                }
            }
        });
    }
    /**
     * 访问 /v1/install 下载 package 压缩文件
     *
     * @param {SpmPackage} spmPackage
     * @param {string} tmpZipPath
     * @returns {Promise<void>}
     * @private
     */
    _packageDownload(spmPackage, tmpZipPath) {
        return __awaiter(this, void 0, void 0, function* () {
            let params = {
                path: spmPackage.downloadUrl,
            };
            yield lib_1.HttpRequest.download(`/v1/install`, params, tmpZipPath);
        });
    }
    /**
     * 将下载的 package 压缩文件进行解压缩，完成后删除压缩文件
     *
     * @param {string} tmpZipPath
     * @param {string} tmpPkgPath
     * @returns {Promise<void>}
     * @private
     */
    _packageUncompress(tmpZipPath, tmpPkgPath) {
        return new Promise((resolve, reject) => {
            if (LibFs.statSync(tmpZipPath).isFile()) {
                LibFs.createReadStream(tmpZipPath)
                    .pipe(unzip.Extract({ path: tmpPkgPath })
                    .on('close', () => {
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
    /**
     * 将已经下载并完成修改的文件内容，拷贝到项目的 spm_protos 中
     *
     * @param {string} dirname
     * @param {string} tmpPkgPath
     * @returns {Promise<void>}
     * @private
     */
    _packageCopy(dirname, tmpPkgPath) {
        return __awaiter(this, void 0, void 0, function* () {
            let packageDir = LibPath.join(LibPath.join(this._projectDir, lib_1.Spm.INSTALL_DIR_NAME), dirname);
            if (LibFs.existsSync(packageDir) && LibFs.statSync(packageDir).isDirectory()) {
                yield lib_1.rmdir(packageDir);
            }
            yield LibFs.rename(tmpPkgPath, packageDir);
        });
    }
    /**
     * 根据 dependenciesChanged 内容，根据 key 值，替换已下载的包中的 proto 文件。
     * 1. proto 文件的包名与 key 值相同，则进行替换，eg:
     *      package order；=> package order__v1;
     * 2. proto 文件中 import 了 key 值相同的包名，则进行替换，eg：
     *      import order/ => import order__v1/
     *      (order.***) => (order__v1.***)
     *      order.*** => order__v1.***
     *
     * @param {string} dirname
     * @param {SpmPackage} spmPackage
     * @param {string} tmpPkgPath
     * @returns {Promise<void>}
     * @private
     */
    _packageReplaceName(dirname, spmPackage, tmpPkgPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(spmPackage.dependenciesChanged) && spmPackage.name == dirname) {
                return Promise.resolve();
            }
            else {
                const files = yield recursive(tmpPkgPath, ['.DS_Store']);
                let count = 0;
                for (let file of files) {
                    count++;
                    if (LibPath.basename(file).match(/.+\.proto/) !== null) {
                        if (spmPackage.name != dirname) {
                            yield lib_1.Spm.replaceStringInFile(file, [
                                [new RegExp(`package ${spmPackage.name};`, 'g'), `package ${dirname};`]
                            ]);
                        }
                        for (let oldString in spmPackage.dependenciesChanged) {
                            let newString = spmPackage.dependenciesChanged[oldString];
                            yield lib_1.Spm.replaceStringInFile(file, [
                                [new RegExp(`import "${oldString}/`, 'g'), `import "${newString}/`],
                                [new RegExp(`\\((${oldString}.*?)\\)`, 'g'), (word) => word.replace(oldString, newString)],
                                [new RegExp(` (${oldString}.*?) `, 'g'), (word) => word.replace(oldString, newString)]
                            ]);
                        }
                    }
                    if (count == files.length) {
                        return Promise.resolve();
                    }
                }
            }
        });
    }
}
exports.UpdateCLI = UpdateCLI;
UpdateCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});

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
const program = require("commander");
const LibPath = require("path");
const LibFs = require("mz/fs");
const bluebird = require("bluebird");
const LibMkdirP = require("mkdirp");
const lib_1 = require("./lib/lib");
const http = require("http");
const recursive = require("recursive-readdir");
const unzip = require("unzip");
const qs = require("querystring");
const _ = require("underscore");
const mkdir = bluebird.promisify(LibMkdirP);
const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:install');
program.version(pkg.version)
    .option('-n, --name <item>', 'package name')
    .option('-p, --projectDir <dir>', 'project dir')
    .parse(process.argv);
const NAME_VALUE = program.name === undefined ? undefined : program.name;
const PROJECT_DIR_VALUE = program.projectDir === undefined ? undefined : program.projectDir;
class InstallCLI {
    static instance() {
        return new InstallCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI start.');
            yield this._validate();
            yield this._initLocaleInfo();
            yield this._initRemoteInfo();
            yield this._deploy();
            // await this._uncompress();
        });
    }
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI validate.');
            if (!NAME_VALUE) {
                throw new Error('--name is required');
            }
            // 向上查找项目文件夹根目录
            if (!PROJECT_DIR_VALUE) {
                this._projectDir = lib_1.findProjectDir(__dirname);
            }
            else {
                this._projectDir = PROJECT_DIR_VALUE;
            }
        });
    }
    _initLocaleInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI init LocaleInfo.');
            // 创建临时文件夹
            this._tmpDir = LibPath.join(__dirname, '..', '..', 'tmp');
            this._tmpFileName = Math.random().toString(16) + ".zip";
            yield mkdir(this._tmpDir);
            // 创建项目根目录下的spm_protos文件夹
            this._projectProtoDir = LibPath.join(this._projectDir, "spm_protos");
            this._projectInstalled = {};
            yield mkdir(this._projectProtoDir);
            let protoDirStat = yield LibFs.stat(this._projectProtoDir);
            if (protoDirStat.isDirectory()) {
                let files = yield recursive(this._projectProtoDir, [".DS_Store"]);
                for (let file of files) {
                    let basename = LibPath.basename(file);
                    if (basename.match(/.+\.json/) !== null) {
                        let name = LibPath.dirname(file).replace(this._projectProtoDir, '').replace('\\', '').replace('/', '');
                        let packageOption = JSON.parse(LibFs.readFileSync(file).toString());
                        let [major, minor, patch] = packageOption.version.split('.');
                        this._projectInstalled[name] = [major, minor, patch];
                    }
                }
            }
        });
    }
    _initRemoteInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI init remote info.');
            this._installList = {};
            // 创建临时文件夹
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let reqParamsStr = qs.stringify({
                    name: NAME_VALUE,
                });
                // create request
                let reqOptions = yield lib_1.SpmHttp.getRequestOption('/v1/depend', lib_1.RequestMethod.post);
                let req = http.request(reqOptions, (res) => {
                    res.on("data", (chunk) => {
                        let response = JSON.parse(chunk.toString());
                        let depends = response.msg;
                        if (_.isObject(depends)) {
                            for (let pkgName in depends) {
                                let [name, version] = pkgName.split('@');
                                this._mergeInstallPackage(name, version, depends[pkgName].path, depends[pkgName].dependencies);
                            }
                            this._changeInstallDependencies();
                            resolve();
                        }
                        else {
                            reject(new Error(chunk.toString()));
                        }
                    });
                }).on('error', (e) => reject(e));
                // send request headers
                req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
                req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
                req.write(reqParamsStr);
            }));
        });
    }
    _mergeInstallPackage(name, version, path, dependencies, deepLevel = 0, originalName) {
        let [nextMajor, nextMinor, nextPatch] = version.split('.');
        if (this._projectInstalled.hasOwnProperty(name)) {
            let [curMajor, curMinor, curPath] = this._projectInstalled[name];
            if (nextMajor == curMajor) {
                if (nextMinor < curMinor || nextMinor == curMinor && nextPatch < curPath) {
                    // 依赖版本低于当前版本，不处理，其他情况都要重新下载
                }
                else {
                    this._projectInstalled[name] = [nextMajor, nextMinor, nextPatch];
                    this._installList[name] = {
                        version: [nextMajor, nextMinor, nextPatch],
                        path: path,
                        dependencies: dependencies
                    };
                    if (originalName) {
                        this._installList[name].originalName = originalName;
                    }
                }
            }
            else {
                if (deepLevel == 0) {
                    this._mergeInstallPackage(name + nextMajor, version, path, dependencies, 1, name);
                }
            }
        }
        else {
            this._projectInstalled[name] = [nextMajor, nextMinor, nextPatch];
            this._installList[name] = {
                version: [nextMajor, nextMinor, nextPatch],
                path: path,
                dependencies: dependencies
            };
            if (originalName) {
                this._installList[name].originalName = originalName;
            }
        }
    }
    _changeInstallDependencies() {
        for (let name in this._installList) {
            this._installList[name].dependenciesChangeMap = {};
            for (let dependName in this._installList[name].dependencies) {
                let [dependMajor] = this._installList[name].dependencies[dependName].split('.');
                if (this._projectInstalled.hasOwnProperty(dependName)) {
                    let [installMajor] = this._projectInstalled[dependName];
                    if (installMajor != dependMajor) {
                        this._installList[name].dependenciesChangeMap[dependName] = dependName + dependMajor;
                    }
                }
            }
        }
    }
    _deploy() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI deploy.');
            for (let name in this._installList) {
                yield this._install(name, this._installList[name]);
            }
        });
    }
    _install(name, info) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI install. name: ' + name);
            let tmpName = name + this._tmpFileName;
            let tmpZipPath = LibPath.join(this._tmpDir, tmpName);
            let tmpPkgPath = LibPath.join(this._tmpDir, name);
            // download file
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                debug('InstallCLI download.');
                let reqParamsStr = qs.stringify({
                    path: info.path,
                });
                let fileStream = LibFs.createWriteStream(tmpZipPath);
                // create request
                let reqOptions = yield lib_1.SpmHttp.getRequestOption('/v1/install', lib_1.RequestMethod.post);
                let req = http.request(reqOptions, (res) => {
                    if (res.headers['content-type'] == 'application/octet-stream') {
                        res.pipe(fileStream);
                        res.on("end", () => {
                            debug('InstallCLI download finish');
                            resolve();
                        });
                    }
                    else {
                        res.on("data", (chunk) => reject(new Error(chunk.toString())));
                    }
                }).on('error', (e) => reject(e));
                // send request headers
                req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
                req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
                req.write(reqParamsStr);
            }));
            // unzip file
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                debug('InstallCLI unzip.');
                let fileStat = yield LibFs.stat(tmpZipPath);
                if (fileStat.isFile()) {
                    LibFs.createReadStream(tmpZipPath).pipe(unzip.Extract({ path: tmpPkgPath }).on("close", () => __awaiter(this, void 0, void 0, function* () {
                        debug('InstallCLI unzip finish');
                        yield LibFs.unlink(tmpZipPath);
                        resolve();
                    })));
                }
                else {
                    yield LibFs.unlink(tmpZipPath);
                    reject(new Error("Download file corruption."));
                }
            }));
            // change package name
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                debug('InstallCLI replace.');
                if (_.isEmpty(info.dependenciesChangeMap) && _.isEmpty(info.originalName)) {
                    resolve();
                }
                else {
                    let files = yield recursive(tmpPkgPath, ['.DS_Store']);
                    let count = 0;
                    yield files.map((file) => __awaiter(this, void 0, void 0, function* () {
                        count++;
                        if (LibPath.basename(file).match(/.+\.proto/) !== null) {
                            if (!_.isEmpty(info.originalName)) {
                                yield this._replaceStringInFile(file, [
                                    [new RegExp(`package ${info.originalName};`, "g"), `package ${name};`]
                                ]);
                            }
                            if (!_.isEmpty(info.dependenciesChangeMap)) {
                                for (let oldDependName in info.dependenciesChangeMap) {
                                    let newDependName = info.dependenciesChangeMap[oldDependName];
                                    yield this._replaceStringInFile(file, [
                                        [new RegExp(`import "${oldDependName}/`, "g"), `import "${newDependName}/`],
                                        [new RegExp(`\\((${oldDependName}.*?)\\)`, "g"), (word) => word.replace(oldDependName, newDependName)],
                                        [new RegExp(` (${oldDependName}.*?) `, "g"), (word) => word.replace(oldDependName, newDependName)]
                                    ]);
                                }
                            }
                            if (count == files.length) {
                                resolve();
                            }
                        }
                    }));
                }
            }));
            yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                debug('InstallCLI spm_proto dir.');
                let installDir = LibPath.join(this._projectProtoDir, name);
                yield lib_1.rmdir(installDir);
                yield LibFs.rename(tmpPkgPath, installDir);
                resolve();
            }));
        });
    }
    _replaceStringInFile(filePath, conditions) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let fileStat = yield LibFs.stat(filePath);
                if (fileStat.isFile()) {
                    let content = LibFs.readFileSync(filePath).toString();
                    for (let [reg, word] of conditions) {
                        content = content.toString().replace(reg, word);
                    }
                    yield LibFs.writeFile(filePath, Buffer.from(content), (err) => {
                        if (err) {
                            throw err;
                        }
                    });
                }
            }
            catch (e) {
                throw e;
            }
        });
    }
}
InstallCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=spm-install.js.map
import * as program from "commander";
import * as LibPath from "path";
import * as LibFs from "mz/fs";
import {findProjectDir, RequestMethod, rmdir, SpmHttp, SpmPackageInfoSchema, SpmPackageConfig} from "./lib/lib";
import * as http from "http";
import * as recursive from "recursive-readdir";
import * as unzip from "unzip";
import * as qs from "querystring";
import * as _ from "underscore";
import {ResponseSchema} from "../lib/Router";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:install');

program.version(pkg.version)
    .option('-n, --name <item>', 'package name')
    .option('-p, --projectDir <dir>', 'project dir')
    .parse(process.argv);

const NAME_VALUE = (program as any).name === undefined ? undefined : (program as any).name;
const PROJECT_DIR_VALUE = (program as any).projectDir === undefined ? undefined : (program as any).projectDir;

class InstallCLI {
    private _tmpDir: string;
    private _tmpFileName: string;
    private _projectDir: string;
    private _projectProtoDir: string;
    private _projectInstalled: { [dirName: string]: [string, string, string] };
    private _installList: { [dirName: string]: SpmPackageInfoSchema };

    static instance() {
        return new InstallCLI();
    }

    public async run() {
        debug('InstallCLI start.');
        await this._validate();
        await this._initLocaleInfo();
        await this._initRemoteInfo();
        await this._deploy();
    }

    private async _validate() {
        debug('InstallCLI validate.');

        if (!NAME_VALUE) {
            throw new Error('--name is required');
        }

        // 向上查找项目文件夹根目录
        if (!PROJECT_DIR_VALUE) {
            this._projectDir = findProjectDir(__dirname);
        } else {
            this._projectDir = PROJECT_DIR_VALUE;
        }
    }

    private async _initLocaleInfo() {
        debug('InstallCLI init LocaleInfo.');

        // 创建临时文件夹
        this._tmpDir = LibPath.join(__dirname, '..', '..', 'tmp');
        this._tmpFileName = Math.random().toString(16) + ".zip";
        await mkdir(this._tmpDir);

        // 创建项目根目录下的spm_protos文件夹
        this._projectProtoDir = LibPath.join(this._projectDir, "spm_protos");
        this._projectInstalled = {};
        await mkdir(this._projectProtoDir);

        let protoDirStat = await LibFs.stat(this._projectProtoDir);
        if (protoDirStat.isDirectory()) {
            let files = await recursive(this._projectProtoDir, [".DS_Store"]);
            for (let file of files) {
                let basename = LibPath.basename(file);
                if (basename.match(/.+\.json/) !== null) {
                    let name = LibPath.dirname(file).replace(this._projectProtoDir, '').replace('\\', '').replace('/', '');
                    let packageOption = JSON.parse(LibFs.readFileSync(file).toString()) as SpmPackageConfig;
                    let [major, minor, patch] = packageOption.version.split('.');
                    this._projectInstalled[name] = [major, minor, patch];
                }
            }
        }
    }

    private async _initRemoteInfo() {
        debug('InstallCLI init remote info.');

        this._installList = {};

        // 创建临时文件夹
        await new Promise(async (resolve, reject) => {
            let reqParamsStr = qs.stringify({
                name: NAME_VALUE,
            });

            // create request
            let reqOptions = await SpmHttp.getRequestOption('/v1/depend', RequestMethod.post);
            let req = http.request(reqOptions, (res) => {
                res.on("data", (chunk) => {
                    let response = JSON.parse(chunk.toString()) as ResponseSchema;
                    let depends = response.msg;
                    if (_.isObject(depends)) {
                        for (let pkgName in depends as SpmPackageInfoSchema) {
                            let [name, version] = pkgName.split('@');
                            this._mergeInstallPackage(name, version, depends[pkgName].path, depends[pkgName].dependencies);
                        }

                        this._changeInstallDependencies();
                        resolve();
                    } else {
                        reject(new Error(chunk.toString()));
                    }
                });
            }).on('error', (e) => reject(e));

            // send request headers
            req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
            req.write(reqParamsStr);
        });

    }

    private _mergeInstallPackage(name: string, version: string, path: string, dependencies: { [key: string]: string }, deepLevel: number = 0, originalName?: string): void {
        let [nextMajor, nextMinor, nextPatch] = version.split('.');

        if (this._projectInstalled.hasOwnProperty(name)) {
            let [curMajor, curMinor, curPath] = this._projectInstalled[name];
            if (nextMajor == curMajor) {
                if (nextMinor < curMinor || nextMinor == curMinor && nextPatch < curPath) {
                    // 依赖版本低于当前版本，不处理，其他情况都要重新下载
                } else {
                    this._projectInstalled[name] = [nextMajor, nextMinor, nextPatch];
                    this._installList[name] = {
                        name: (originalName) ? originalName : name,
                        version: [nextMajor, nextMinor, nextPatch],
                        path: path,
                        dependencies: dependencies
                    };
                }
            } else {
                if (deepLevel == 0) {
                    this._mergeInstallPackage(name + nextMajor, version, path, dependencies, 1, name);
                }
            }
        } else {
            this._projectInstalled[name] = [nextMajor, nextMinor, nextPatch];
            this._installList[name] = {
                name: (originalName) ? originalName : name,
                version: [nextMajor, nextMinor, nextPatch],
                path: path,
                dependencies: dependencies
            };
        }
    }

    private _changeInstallDependencies() {
        for (let name in this._installList) {
            this._installList[name].dependenciesChangeMap = {};
            for (let dependName in this._installList[name].dependencies) {
                let [dependMajor] = this._installList[name].dependencies[dependName].split('.');
                if (this._projectInstalled.hasOwnProperty(dependName)) {
                    let [installMajor] = this._projectInstalled[dependName];
                    if (installMajor != dependMajor) {
                        this._installList[name].dependenciesChangeMap[dependName] = dependName + dependMajor
                    }
                }
            }
        }
    }

    private async _deploy() {
        debug('InstallCLI deploy.');
        for (let name in this._installList) {
            await this._install(name, this._installList[name]);
        }
    }

    private async _install(name: string, info: SpmPackageInfoSchema) {
        debug('InstallCLI install. name: ' + name);

        let tmpName = name + this._tmpFileName;
        let tmpZipPath = LibPath.join(this._tmpDir, tmpName);
        let tmpPkgPath = LibPath.join(this._tmpDir, name);

        // download file
        await new Promise(async (resolve, reject) => {
            debug('InstallCLI download.');
            let reqParamsStr = qs.stringify({
                path: info.path,
            });

            let fileStream = LibFs.createWriteStream(tmpZipPath);

            // create request
            let reqOptions = await SpmHttp.getRequestOption('/v1/install', RequestMethod.post);
            let req = http.request(reqOptions, (res) => {
                if (res.headers['content-type'] == 'application/octet-stream') {
                    res.pipe(fileStream);
                    res.on("end", () => {
                        debug('InstallCLI download finish');
                        resolve();
                    });
                } else {
                    res.on("data", (chunk) => reject(new Error(chunk.toString())));
                }
            }).on('error', (e) => reject(e));

            // send request headers
            req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
            req.write(reqParamsStr);
        });

        // unzip file
        await new Promise(async (resolve, reject) => {
            debug('InstallCLI unzip.');
            let fileStat = await LibFs.stat(tmpZipPath);
            if (fileStat.isFile()) {
                LibFs.createReadStream(tmpZipPath).pipe(unzip.Extract({ path: tmpPkgPath }).on("close", async () => {
                    debug('InstallCLI unzip finish');
                    await LibFs.unlink(tmpZipPath);
                    resolve();
                }));
            } else {
                await LibFs.unlink(tmpZipPath);
                reject(new Error("Download file corruption."))
            }
        });

        // change package name
        await new Promise(async (resolve, reject) => {
            debug('InstallCLI replace.');
            if (_.isEmpty(info.dependenciesChangeMap) && info.name == name) {
                resolve();
            } else {
                let files = await recursive(tmpPkgPath, ['.DS_Store']);
                let count = 0;
                await files.map(async (file: string) => {
                    count++;
                    if (LibPath.basename(file).match(/.+\.proto/) !== null) {
                        if (info.name != name) {
                            await this._replaceStringInFile(file, [
                                [new RegExp(`package ${info.name};`,"g"), `package ${name};`]
                            ]);
                        }

                        if (!_.isEmpty(info.dependenciesChangeMap)) {
                            for (let oldDependName in info.dependenciesChangeMap) {
                                let newDependName = info.dependenciesChangeMap[oldDependName];
                                await this._replaceStringInFile(file, [
                                    [new RegExp(`import "${oldDependName}/`,"g"), `import "${newDependName}/`],
                                    [new RegExp(`\\((${oldDependName}.*?)\\)`,"g"), (word) => word.replace(oldDependName, newDependName)],
                                    [new RegExp(` (${oldDependName}.*?) `,"g"), (word) => word.replace(oldDependName, newDependName)]
                                ]);
                            }
                        }

                        if (count == files.length) {
                            resolve();
                        }
                    }
                });
            }
        });

        await new Promise(async (resolve) => {
            debug('InstallCLI spm_proto dir.');
            let installDir = LibPath.join(this._projectProtoDir, name);
            await rmdir(installDir);
            await LibFs.rename(tmpPkgPath, installDir);
            resolve();
        })
    }

    private async _replaceStringInFile(filePath: string, conditions: Array<[RegExp, any]>) {
        try {
            let fileStat = await LibFs.stat(filePath);
            if (fileStat.isFile()) {
                let content = LibFs.readFileSync(filePath).toString();
                for (let [reg, word] of conditions) {
                    content = content.toString().replace(reg, word);
                }
                await LibFs.writeFile(filePath, Buffer.from(content), (err) => {
                    if (err) {
                        throw err;
                    }
                });
            }
        } catch (e) {
            throw e;
        }
    }
}

InstallCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
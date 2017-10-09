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
const archiver = require("archiver");
const _ = require("underscore");
const lib_1 = require("./lib/lib");
const pkg = require('../../package.json');
program.version(pkg.version)
    .parse(process.argv);
class PublishCLI {
    static instance() {
        return new PublishCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('PublishCLI start.');
            yield this._validate();
            yield this._prepare();
            yield this._compress();
            yield this._publish();
            console.log('PublishCLI complete.');
        });
    }
    /**
     * 验证参数，数据，环境是否正确
     *
     * @returns {Promise<void>}
     * @private
     */
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('PublishCLI validate.');
            this._projectDir = lib_1.Spm.getProjectDir();
            let configStat = yield LibFs.stat(LibPath.join(this._projectDir, 'spm.json'));
            if (!configStat.isFile()) {
                throw new Error('File: `spm.json` not found in project:' + this._projectDir);
            }
            let protoStat = yield LibFs.stat(LibPath.join(this._projectDir, 'proto'));
            if (!protoStat.isDirectory()) {
                throw new Error('Dir: `proto` not found in project:' + this._projectDir);
            }
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
            console.log('PublishCLI prepare.');
            this._packageConfig = lib_1.Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));
            if (!this._packageConfig.name || _.isEmpty(this._packageConfig.name) || typeof this._packageConfig.name !== 'string') {
                throw new Error('Package param: `name` is required');
            }
            if (!this._packageConfig.version || _.isEmpty(this._packageConfig.version) || typeof this._packageConfig.version !== 'string') {
                throw new Error('Package param: `version` is required');
            }
            let packageStat = yield LibFs.stat(LibPath.join(this._projectDir, 'proto', this._packageConfig.name));
            if (!packageStat.isDirectory()) {
                throw new Error(`Dir: ${this._packageConfig.name} not found in project:' + this._projectDir`);
            }
            // 创建临时文件夹，生成临时文件名
            this._tmpFilePath = LibPath.join(lib_1.Spm.SPM_ROOT_PATH, 'tmp');
            this._tmpFileName = Math.random().toString(16) + '.zip';
            yield lib_1.mkdir(this._tmpFilePath);
        });
    }
    /**
     * 创建发布使用的压缩包。
     *
     * @returns {Promise<void>}
     * @private
     */
    _compress() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('PublishCLI compress.');
            // 创建 archive 对象
            let archive = archiver('zip', { zlib: { level: 9 } });
            archive.on('error', (err) => {
                console.log(err.message);
            });
            // 添加 ${pwd}/proto/${pkgName} 到 archive 对象
            archive.directory(LibPath.join(this._projectDir, 'proto', this._packageConfig.name), false);
            // 添加 ${pwd}/spm.json 到 archive 对象
            archive.append(LibFs.createReadStream(LibPath.join(this._projectDir, 'spm.json')), { name: 'spm.json' });
            // 由于执行 archive finalize 时，实际压缩包并未完成，所以需要用 promise 将下述代码包起来。
            // 通过判断 writeSteam 的 close 事件，来判断压缩包是否完成创建。
            yield new Promise((resolve, reject) => {
                let writeStream = LibFs.createWriteStream(LibPath.join(this._tmpFilePath, this._tmpFileName));
                writeStream.on('close', () => {
                    console.log('PublishCLI compress completed!');
                    resolve();
                });
                archive.pipe(writeStream);
                archive.finalize().catch((e) => {
                    reject(e);
                });
            });
        });
    }
    /**
     * 访问 /v1/publish, 提交压缩包
     *
     * @returns {Promise<void>}
     * @private
     */
    _publish() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('PublishCLI publish.');
            // build params
            let params = {
                name: this._packageConfig.name,
                version: this._packageConfig.version,
                description: this._packageConfig.description || '',
                dependencies: JSON.stringify(this._packageConfig.dependencies),
                secret: lib_1.Spm.loadSecret(),
            };
            // upload file stream
            let filePath = LibPath.join(this._tmpFilePath, this._tmpFileName);
            let fileUploadStream = LibFs.createReadStream(filePath);
            yield lib_1.HttpRequest.upload(`/v1/publish`, params, fileUploadStream).then(() => {
                LibFs.unlink(filePath).catch((e) => {
                    throw e;
                });
            });
        });
    }
    ;
}
exports.PublishCLI = PublishCLI;
PublishCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});

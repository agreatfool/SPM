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
const debug = require('debug')('SPM:CLI:publish');
program.version(pkg.version)
    .parse(process.argv);
class PublishCLI {
    static instance() {
        return new PublishCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI start.');
            yield this._validate();
            yield this._prepare();
            yield this._compress();
            yield this._publish();
        });
    }
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI validate.');
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
    _prepare() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI prepare.');
            this._packageConfig = lib_1.Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));
            if (!this._packageConfig.name || _.isEmpty(this._packageConfig.name) || typeof this._packageConfig.name !== 'string') {
                throw new Error('Package param: `name` is required');
            }
            if (!this._packageConfig.version || _.isEmpty(this._packageConfig.version) || typeof this._packageConfig.version !== 'string') {
                throw new Error('Package param: `version` is required');
            }
            this._tmpDir = LibPath.join(lib_1.Spm.SPM_ROOT_PATH, 'tmp');
            this._tmpFileName = Math.random().toString(16) + '.zip';
            yield lib_1.mkdir(this._tmpDir);
        });
    }
    _compress() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI compress.');
            let tmpFilePath = LibPath.join(this._tmpDir, this._tmpFileName);
            // create a file to stream archive data to.
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                // create write stream
                let writeStream = LibFs.createWriteStream(tmpFilePath)
                    .on('close', () => {
                    resolve();
                });
                // archive init
                let archive = archiver('zip', { zlib: { level: 9 } })
                    .on('error', (err) => reject(err));
                archive.pipe(writeStream);
                archive.directory(LibPath.join(this._projectDir, 'proto'), false);
                archive.append(LibFs.createReadStream(LibPath.join(this._projectDir, 'spm.json')), { name: 'spm.json' });
                yield archive.finalize();
            }));
            debug('PublishCLI compress finish.');
        });
    }
    _publish() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI publish.');
            let tmpFilePath = LibPath.join(this._tmpDir, this._tmpFileName);
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                // build params
                let params = {
                    name: this._packageConfig.name,
                    version: this._packageConfig.version,
                    description: this._packageConfig.description || '',
                    dependencies: JSON.stringify(this._packageConfig.dependencies),
                    secret: lib_1.Spm.loadSecret(),
                };
                let filePath = [tmpFilePath];
                yield lib_1.SpmPackageRequest.postFormRequest('/v1/publish', params, filePath, (chunk, reqResolve) => __awaiter(this, void 0, void 0, function* () {
                    debug(`PublishCLI publish: [Response] - ${chunk}`);
                    reqResolve();
                })).then(() => __awaiter(this, void 0, void 0, function* () {
                    if (filePath.length > 0) {
                        yield LibFs.unlink(filePath[0]);
                    }
                    resolve();
                })).catch((e) => __awaiter(this, void 0, void 0, function* () {
                    if (filePath.length > 0) {
                        yield LibFs.unlink(filePath[0]);
                    }
                    reject(e);
                }));
            }));
        });
    }
    ;
}
exports.PublishCLI = PublishCLI;
PublishCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=spm-publish.js.map
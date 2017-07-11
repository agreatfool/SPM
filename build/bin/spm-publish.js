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
const http = require("http");
const _ = require("underscore");
const lib_1 = require("./lib/lib");
const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:publish');
program.version(pkg.version)
    .option('-i, --import <dir>', 'directory of source proto files for publish to spm server')
    .parse(process.argv);
const IMPORT_DIR = program.import === undefined ? undefined : LibPath.normalize(program.import);
class PublishCLI {
    static instance() {
        return new PublishCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI start.');
            yield this._validate();
            yield this._load();
            yield this._compress();
            yield this._publish();
        });
    }
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI validate.');
            if (!IMPORT_DIR) {
                throw new Error('--import is required');
            }
            let importStat = yield LibFs.stat(IMPORT_DIR);
            if (!importStat.isDirectory()) {
                throw new Error('--import is not a directory');
            }
        });
    }
    _load() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI load.');
            let importFiles = yield LibFs.readdir(IMPORT_DIR);
            if (importFiles.indexOf('spm.json') < 0) {
                throw new Error('File: `spm.json` not found in import dir:' + IMPORT_DIR);
            }
            let packageStr = yield LibFs.readFileSync(LibPath.join(IMPORT_DIR, 'spm.json')).toString();
            try {
                this._packageOption = JSON.parse(packageStr);
            }
            catch (e) {
                throw new Error(`Error: ${e.message}`);
            }
            if (!this._packageOption.name || _.isEmpty(this._packageOption.name) || typeof this._packageOption.name !== 'string') {
                throw new Error('Package param: `name` is required');
            }
            if (!this._packageOption.version || _.isEmpty(this._packageOption.version) || typeof this._packageOption.version !== 'string') {
                throw new Error('Package param: `version` is required');
            }
            this._tmpZipPath = LibPath.join(__dirname, '..', '..', 'tmp', Math.random().toString(16) + ".zip");
        });
    }
    _compress() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI compress.');
            // create a file to stream archive data to.
            yield new Promise((resolve, reject) => {
                let output = LibFs.createWriteStream(this._tmpZipPath).on("close", () => {
                    debug('PublishCLI compress finish.');
                    resolve();
                });
                let archive = archiver('zip', { zlib: { level: 9 } });
                archive.on('warning', (err) => {
                    if (err.code === 'ENOENT') {
                        debug("Archive waring:" + err.message);
                    }
                    else {
                        reject(err);
                    }
                });
                archive.on('error', (err) => {
                    reject(err);
                });
                archive.pipe(output);
                archive.directory(IMPORT_DIR, false);
                archive.finalize();
            });
        });
    }
    _publish() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI publish.');
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                // build header
                let reqParams = {
                    name: this._packageOption.name,
                    version: this._packageOption.version,
                    secret: lib_1.SpmSecret.load(),
                };
                let boundaryKey = Math.random().toString(16);
                let enddata = '\r\n----' + boundaryKey + '--';
                let content = '';
                for (let key in reqParams) {
                    content += '\r\n----' + boundaryKey + '\r\n'
                        + 'Content-Disposition: form-data; name="' + key + '" \r\n\r\n'
                        + encodeURIComponent(reqParams[key]);
                }
                content += '\r\n----' + boundaryKey + '\r\n'
                    + 'Content-Type: application/octet-stream\r\n'
                    + 'Content-Disposition: form-data; name="fileUpload"; filename="' + `${reqParams.name}@${reqParams.version}.zip` + '"\r\n'
                    + "Content-Transfer-Encoding: binary\r\n\r\n";
                let contentBinary = new Buffer(content, 'utf-8');
                let contentLength = LibFs.statSync(this._tmpZipPath).size + contentBinary.length;
                // create request
                let reqOptions = yield lib_1.SpmHttp.getRequestOption('/v1/publish', lib_1.RequestMethod.post);
                let req = http.request(reqOptions, (res) => {
                    res.on('data', (chunk) => __awaiter(this, void 0, void 0, function* () {
                        debug(`PublishCLI publish: [Response] - ${chunk}`);
                        yield LibFs.unlink(this._tmpZipPath);
                        resolve();
                    }));
                }).on('error', (e) => reject(e));
                // send request headers
                req.setHeader('Content-Type', 'multipart/form-data; boundary=--' + boundaryKey);
                req.setHeader('Content-Length', `${contentLength + Buffer.byteLength(enddata)}`);
                req.write(contentBinary);
                // send request stream
                let fileStream = LibFs.createReadStream(this._tmpZipPath);
                fileStream.on('end', () => {
                    req.end(enddata);
                    debug(`PublishCLI publish finish.`);
                });
                fileStream.pipe(req, { end: false });
            }));
        });
    }
    ;
}
PublishCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=spm-publish.js.map
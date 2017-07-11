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
const lib_1 = require("./lib/lib");
const http = require("http");
const qs = require("querystring");
const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:install');
program.version(pkg.version)
    .option('-n, --name <item>', 'package name')
    .parse(process.argv);
const NAME_VALUE = program.name === undefined ? undefined : program.name;
class InstallCLI {
    static instance() {
        return new InstallCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI start.');
            yield this._validate();
            yield this._download();
            yield this._uncompress();
        });
    }
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI validate.');
            if (!NAME_VALUE) {
                throw new Error('--name is required');
            }
        });
    }
    _download() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI download.');
            this._tmpZipPath = LibPath.join(__dirname, '..', '..', 'tmp', Math.random().toString(16) + ".zip");
            let stream = LibFs.createWriteStream(this._tmpZipPath).on("close", () => {
                debug("InstallCLI download finish!");
            });
            let reqOptions = yield lib_1.SpmHttp.getRequestOption('/v1/install', lib_1.RequestMethod.post);
            let req = yield http.request(reqOptions, (res) => {
                if (res.headers['content-type'] == 'application/octet-stream') {
                    res.pipe(stream);
                }
                else {
                    res.on("data", (chunk) => {
                        debug(`[Request] - chunk:${chunk}`);
                    });
                }
            }).on('error', (e) => {
                debug(`[RequestError] - error:${e.message}`);
            });
            let reqParamsStr = qs.stringify({
                name: NAME_VALUE,
            });
            req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
            req.write(reqParamsStr);
            //await LibFs.unlink(downloadFile);
        });
    }
    _uncompress() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('InstallCLI uncompress.');
            let fileStat = yield LibFs.stat(this._tmpZipPath);
            if (fileStat.isFile()) {
                console.log(fileStat.size);
            }
            else {
            }
        });
    }
}
InstallCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=spm-install.js.map
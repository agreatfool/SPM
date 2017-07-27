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
const LibPath = require("path");
const LibFs = require("mz/fs");
const program = require("commander");
const _ = require("underscore");
const lib_1 = require("./lib/lib");
const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:secret');
program.version(pkg.version)
    .parse(process.argv);
class SecretCLI {
    static instance() {
        return new SecretCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('SecretCLI start.');
            yield this._validate();
            yield this._save();
        });
    }
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('SecretCLI validate.');
            this._projectDir = lib_1.Spm.getProjectDir();
            let configStat = yield LibFs.stat(LibPath.join(this._projectDir, 'spm.json'));
            if (!configStat.isFile()) {
                throw new Error('File: `spm.json` not found in project:' + this._projectDir);
            }
            this._packageConfig = lib_1.Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));
            if (!this._packageConfig.name || _.isEmpty(this._packageConfig.name) || typeof this._packageConfig.name !== 'string') {
                throw new Error('Package param: `name` is required');
            }
        });
    }
    _save() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('SecretCLI save.');
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let params = {
                    name: this._packageConfig.name
                };
                lib_1.SpmPackageRequest.postRequest('/v1/secret', params, (chunk, reqResolve, reqReject) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        reqResolve(lib_1.SpmPackageRequest.parseResponse(chunk));
                    }
                    catch (e) {
                        reqReject(e);
                    }
                })).then((response) => __awaiter(this, void 0, void 0, function* () {
                    yield lib_1.Spm.saveSecret(response.secret);
                    resolve();
                })).catch((e) => {
                    reject(e);
                });
            }));
        });
    }
}
exports.SecretCLI = SecretCLI;
SecretCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=spm-secret.js.map
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
program.version(pkg.version)
    .parse(process.argv);
class SecretCLI {
    static instance() {
        return new SecretCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('SecretCLI start.');
            yield this._validate();
            yield this._saveSecret();
            console.log('SecretCLI complete.');
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
            console.log('SecretCLI validate.');
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
    /**
     * 保存 secret 到本地文件
     *
     * @returns {Promise<void>}
     * @private
     */
    _saveSecret() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('SecretCLI saveSecret');
            let response = yield this._genSecret();
            lib_1.Spm.saveSecret(response.secret);
        });
    }
    /**
     * 访问 /v1/secret，获取 secret
     *
     * @returns {Promise<void>}
     * @private
     */
    _genSecret() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('SecretCLI genSecret.');
            let params = {
                name: this._packageConfig.name
            };
            return yield lib_1.HttpRequest.post('/v1/secret', params);
        });
    }
}
exports.SecretCLI = SecretCLI;
SecretCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});

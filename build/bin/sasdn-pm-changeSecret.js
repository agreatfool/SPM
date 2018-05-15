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
const lib_1 = require("./lib/lib");
const pkg = require('../../package.json');
program.version(pkg.version)
    .parse(process.argv);
const PKG_NAME = program.args[0];
const USER_SECRET = program.args[1];
const PKG_SECRET = program.args[2];
class ChangeSecretCLI {
    static instance() {
        return new ChangeSecretCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('ChangeSecretCLI start.');
            this._validateParams();
            yield this._deletePackage();
        });
    }
    _validateParams() {
        if (!PKG_NAME) {
            throw new Error('Please input package name!');
        }
        if (!USER_SECRET) {
            throw new Error('Please input password!');
        }
        if (!PKG_SECRET) {
            throw new Error('Please input package secret!');
        }
    }
    /**
     * 修改中心节点的包的密钥
     * @returns {Promise<void>}
     * @private
     */
    _deletePackage() {
        return __awaiter(this, void 0, void 0, function* () {
            yield lib_1.HttpRequest.post('/v1/change_secret', {
                packageName: PKG_NAME,
                userSecret: USER_SECRET,
                pkgSecret: PKG_SECRET,
            });
            console.log('Change package secret successfully!');
        });
    }
}
exports.ChangeSecretCLI = ChangeSecretCLI;
ChangeSecretCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});

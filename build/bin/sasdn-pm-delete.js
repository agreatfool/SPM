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
const SECRET = program.args[1];
class DeleteCLI {
    static instance() {
        return new DeleteCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('DeleteCLI start.');
            this._validateParams();
            yield this._deletePackage();
        });
    }
    _validateParams() {
        if (!PKG_NAME) {
            throw new Error('Please input package name!');
        }
        if (!SECRET) {
            throw new Error('Please input secret!');
        }
    }
    /**
     * 逻辑删除中心节点的包
     * @returns {Promise<void>}
     * @private
     */
    _deletePackage() {
        return __awaiter(this, void 0, void 0, function* () {
            yield lib_1.HttpRequest.post('/v1/delete_package', { packageName: PKG_NAME, secret: SECRET });
            console.log('Delete package successfully!');
        });
    }
}
exports.DeleteCLI = DeleteCLI;
DeleteCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});

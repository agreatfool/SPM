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
const debug = require('debug')('SPM:CLI:secret');
program.version(pkg.version)
    .option('-s, --secret <item>', 'secret value')
    .parse(process.argv);
const SECRET_VALUE = program.secret === undefined ? undefined : program.secret;
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
            if (!SECRET_VALUE) {
                throw new Error('--secret is required');
            }
        });
    }
    _save() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('SecretCLI save.');
            yield lib_1.SpmSecret.save(SECRET_VALUE);
        });
    }
}
SecretCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=spm-secret.js.map
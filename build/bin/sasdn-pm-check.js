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
class CheckCLI {
    static instance() {
        return new CheckCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('CheckCLI start.');
            yield lib_1.Spm.checkVersion();
        });
    }
}
exports.CheckCLI = CheckCLI;
CheckCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});

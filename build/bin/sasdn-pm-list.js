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
const lib_1 = require("./lib/lib");
const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:list');
program.version(pkg.version)
    .parse(process.argv);
class ListCLI {
    static instance() {
        return new ListCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('ListCLI start.');
            yield this._prepare();
            yield this._show();
        });
    }
    _prepare() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('ListCLI prepare.');
            this._projectDir = lib_1.Spm.getProjectDir();
            this._spmPackageInstallDir = LibPath.join(this._projectDir, lib_1.Spm.INSTALL_DIR_NAME);
        });
    }
    _show() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('ListCLI show.');
            let spmPackageMap = yield lib_1.Spm.getInstalledSpmPackageMap();
            console.log('--------------Installed SpmPackage---------------');
            for (let dirname in spmPackageMap) {
                let spmPackage = spmPackageMap[dirname];
                console.log(`+-- ${spmPackage.name}@${spmPackage.version}`);
                for (let dependName in spmPackage.dependencies) {
                    console.log(`|  | -- ${dependName}@${spmPackage.dependencies[dependName]}`);
                }
            }
            console.log('--------------Installed SpmPackage---------------');
        });
    }
}
exports.ListCLI = ListCLI;
ListCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=sasdn-pm-list.js.map
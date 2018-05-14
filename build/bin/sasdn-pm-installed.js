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
const KEYWORK_VALUE = program.args[0];
class InstalledCLI {
    static instance() {
        return new InstalledCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('InstalledCLI start.');
            yield this._prepare();
            yield this._displayPackageList();
            console.log('InstalledCLI complete.');
        });
    }
    /**
     * 准备命令中需要使用的参数，或创建文件夹。
     *
     * @returns {Promise<void>}
     * @private
     */
    _prepare() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('InstalledCLI prepare.');
            this._projectDir = lib_1.Spm.getProjectDir();
        });
    }
    /**
     * 显示所有已安装的 package
     *
     * @returns {Promise<void>}
     * @private
     */
    _displayPackageList() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('InstalledCLI show.');
            let spmPackageMap = yield lib_1.Spm.getInstalledSpmPackageMap();
            console.log('--------------Installed SpmPackage---------------');
            if (KEYWORK_VALUE !== undefined) {
                this._displayPackage(KEYWORK_VALUE, spmPackageMap);
            }
            else {
                for (let dirname in spmPackageMap) {
                    this._displayPackage(dirname, spmPackageMap);
                }
            }
            console.log('--------------Installed SpmPackage---------------');
        });
    }
    /**
     * 显示名字为 packageName 的已安装的 package
     * @param {string} packageName
     * @param {SpmPackageMap} spmPackageMap
     * @private
     */
    _displayPackage(packageName, spmPackageMap) {
        let spmPackage = spmPackageMap[packageName];
        if (!spmPackage) {
            throw new Error(`${packageName} not exist in SpmPackageList.`);
        }
        let depLength = Object.keys(spmPackage.dependencies).length;
        if (depLength !== 0) {
            console.log(`├─┬ ${spmPackage.name}@${spmPackage.version}`);
        }
        else {
            console.log(`├── ${spmPackage.name}@${spmPackage.version}`);
        }
        let count = 0;
        for (let dependName in spmPackage.dependencies) {
            count += 1;
            if (count !== depLength) {
                console.log(`│ ├── ${dependName}@${spmPackage.dependencies[dependName]}`);
            }
            else {
                console.log(`│ └── ${dependName}@${spmPackage.dependencies[dependName]}`);
            }
        }
    }
}
exports.InstalledCLI = InstalledCLI;
InstalledCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});

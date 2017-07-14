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
const _ = require("underscore");
const lib_1 = require("./lib/lib");
const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:Uninstall');
program.version(pkg.version)
    .option('-i, --import <dir>', 'directory of source proto files for update spm.json')
    .option('-n, --pkgName <item>', 'package name')
    .option('-p, --projectDir <dir>', 'project dir')
    .parse(process.argv);
const PKG_NAME_VALUE = program.pkgName === undefined ? undefined : program.pkgName;
const IMPORT_DIR = program.import === undefined ? undefined : LibPath.normalize(program.import);
const PROJECT_DIR_VALUE = program.projectDir === undefined ? undefined : program.projectDir;
class UninstallCLI {
    static instance() {
        return new UninstallCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('UninstallCLI start.');
            yield this._validate();
            yield this._prepare();
            yield this._comparison();
            yield this._remove();
            yield this._save();
        });
    }
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('UninstallCLI validate.');
            if (!PKG_NAME_VALUE) {
                throw new Error('--pkgName is required');
            }
            if (!IMPORT_DIR) {
                throw new Error('--import is required');
            }
            if (!LibFs.statSync(IMPORT_DIR).isDirectory()) {
                throw new Error('--import is not a directory');
            }
            let importConfigPath = LibPath.join(IMPORT_DIR, 'spm.json');
            this._removePackage = {};
            try {
                let packageConfig = lib_1.Spm.getSpmPackageConfig(importConfigPath);
                if (packageConfig.dependencies.hasOwnProperty(PKG_NAME_VALUE)) {
                    let pkgVersion = packageConfig.dependencies[PKG_NAME_VALUE];
                    delete packageConfig.dependencies[PKG_NAME_VALUE];
                    this._removePackage = {
                        name: PKG_NAME_VALUE,
                        version: pkgVersion
                    };
                    this._packageOption = packageConfig;
                }
            }
            catch (e) {
                throw new Error('ConfigFile: spm.json not found');
            }
            if (_.isEmpty(this._removePackage)) {
                throw new Error('PkgName: ' + PKG_NAME_VALUE + ' not found in spm.json');
            }
        });
    }
    _prepare() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('UninstallCLI prepare.');
            if (!PROJECT_DIR_VALUE) {
                this._projectDir = lib_1.Spm.getProjectDir();
            }
            else {
                this._projectDir = PROJECT_DIR_VALUE;
            }
            this._spmPackageInstallDir = LibPath.join(this._projectDir, lib_1.Spm.INSTALL_DIR_NAME);
            this._spmPackageInstalledMap = yield lib_1.Spm.getInstalledSpmPackageMap(this._spmPackageInstallDir, this._spmPackageInstallDir);
            this._removePackageDirMap = {};
        });
    }
    _comparison() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('UninstallCLI comparison.');
            this._findRemoveDir(this._removePackage.name, this._removePackage.version, this._spmPackageInstalledMap);
            this._checkInstalledDependencies(this._spmPackageInstalledMap);
        });
    }
    _remove() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let dirname in this._removePackageDirMap) {
                yield lib_1.rmdir(LibPath.join(this._spmPackageInstallDir, this._removePackageDirMap[dirname]));
            }
        });
    }
    _save() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('UninstallCLI save.');
            yield LibFs.writeFile(LibPath.join(IMPORT_DIR, 'spm.json'), Buffer.from(JSON.stringify(this._packageOption, null, 2)), (err) => {
                if (err) {
                    throw err;
                }
            });
        });
    }
    _findRemoveDir(pkgName, pkgVersion, spmPackageInstalledMap) {
        let name = `${pkgName}@${pkgVersion}`;
        let [rmMajor] = pkgVersion.split('.');
        // 防止重复查询
        if (this._removePackageDirMap.hasOwnProperty(name)) {
            return this._removePackageDirMap;
        }
        for (let dirname in spmPackageInstalledMap) {
            let spmPackage = spmPackageInstalledMap[dirname];
            let [instMajor] = spmPackage.version.split('.');
            if (pkgName == spmPackage.name && rmMajor == instMajor) {
                this._removePackageDirMap[name] = dirname;
                for (let dependName in spmPackage.dependencies) {
                    this._findRemoveDir(dependName, spmPackage.dependencies[dependName], this._spmPackageInstalledMap);
                }
            }
        }
    }
    _checkInstalledDependencies(spmPackageInstalledMap) {
        // build tmp remove schema
        let removeDirs = {};
        let removePkgVersion = {};
        for (let name in this._removePackageDirMap) {
            let [pkName, version] = name.split('@');
            if (!removePkgVersion.hasOwnProperty(pkName)) {
                removePkgVersion[pkName] = [];
            }
            removePkgVersion[pkName].push(version);
            removeDirs[this._removePackageDirMap[name]] = name;
        }
        // export dependencies package
        for (let dirname in spmPackageInstalledMap) {
            if (removeDirs.hasOwnProperty(dirname)) {
                continue;
            }
            let spmPackage = spmPackageInstalledMap[dirname];
            for (let name in spmPackage.dependencies) {
                if (removePkgVersion.hasOwnProperty(name)) {
                    for (let version of removePkgVersion[name]) {
                        let [instMajor] = spmPackage.dependencies[name].split('.');
                        let [rmMajor] = version.split('.');
                        if (rmMajor == instMajor) {
                            delete this._removePackageDirMap[`${name}@${version}`];
                        }
                    }
                }
            }
        }
    }
}
UninstallCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=spm-uninstall.js.map
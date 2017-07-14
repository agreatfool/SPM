import * as LibFs from "mz/fs";
import * as LibPath from "path";
import * as program from "commander";
import * as _ from "underscore";
import {Spm, rmdir, SpmPackageMap, SpmPackage, SpmPackageConfig} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:Uninstall');

program.version(pkg.version)
    .option('-i, --import <dir>', 'directory of source proto files for update spm.json')
    .option('-n, --pkgName <item>', 'package name')
    .option('-p, --projectDir <dir>', 'project dir')
    .parse(process.argv);

const PKG_NAME_VALUE = (program as any).pkgName === undefined ? undefined : (program as any).pkgName;
const IMPORT_DIR = (program as any).import === undefined ? undefined : LibPath.normalize((program as any).import);
const PROJECT_DIR_VALUE = (program as any).projectDir === undefined ? undefined : (program as any).projectDir;

class UninstallCLI {

    private _projectDir: string;
    private _packageOption: SpmPackageConfig;
    private _spmPackageInstallDir: string;
    private _spmPackageInstalledMap: SpmPackageMap;
    private _removePackage: SpmPackage;
    private _removePackageDirMap: { [name: string]: string };

    static instance() {
        return new UninstallCLI();
    }

    public async run() {
        debug('UninstallCLI start.');
        await this._validate();
        await this._prepare();
        await this._comparison();
        await this._remove();
        await this._save();
    }

    private async _validate() {
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
        this._removePackage = {} as SpmPackage;
        try {
            let packageConfig = Spm.getSpmPackageConfig(importConfigPath);
            if (packageConfig.dependencies.hasOwnProperty(PKG_NAME_VALUE)) {
                let pkgVersion = packageConfig.dependencies[PKG_NAME_VALUE];
                delete packageConfig.dependencies[PKG_NAME_VALUE];
                this._removePackage = {
                    name: PKG_NAME_VALUE,
                    version: pkgVersion
                };
                this._packageOption = packageConfig;
            }
        } catch (e) {
            throw new Error('ConfigFile: spm.json not found');
        }

        if (_.isEmpty(this._removePackage)) {
            throw new Error('PkgName: ' + PKG_NAME_VALUE + ' not found in spm.json');
        }
    }

    private async _prepare() {
        debug('UninstallCLI prepare.');

        if (!PROJECT_DIR_VALUE) {
            this._projectDir = Spm.getProjectDir();
        } else {
            this._projectDir = PROJECT_DIR_VALUE;
        }

        this._spmPackageInstallDir = LibPath.join(this._projectDir, Spm.INSTALL_DIR_NAME);
        this._spmPackageInstalledMap = await Spm.getInstalledSpmPackageMap(this._spmPackageInstallDir, this._spmPackageInstallDir);
        this._removePackageDirMap = {};
    }

    private async _comparison() {
        debug('UninstallCLI comparison.');

        this._findRemoveDir(this._removePackage.name, this._removePackage.version, this._spmPackageInstalledMap);
        this._checkInstalledDependencies(this._spmPackageInstalledMap);
    }

    private async _remove() {
        for (let dirname in this._removePackageDirMap) {
            await rmdir(LibPath.join(this._spmPackageInstallDir, this._removePackageDirMap[dirname]));
        }
    }

    private async _save() {
        debug('UninstallCLI save.');

        await LibFs.writeFile(LibPath.join(IMPORT_DIR, 'spm.json'), Buffer.from(JSON.stringify(this._packageOption, null, 2)), (err) => {
            if (err) {
                throw err;
            }
        });
    }

    private _findRemoveDir(pkgName: string, pkgVersion: string, spmPackageInstalledMap: SpmPackageMap) {
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

    private _checkInstalledDependencies(spmPackageInstalledMap: SpmPackageMap) {

        // build tmp remove schema
        let removeDirs = {} as { [name: string]: string };
        let removePkgVersion = {} as { [name: string]: Array<string> };
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

UninstallCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
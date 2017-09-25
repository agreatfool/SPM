import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import * as program from 'commander';
import * as _ from 'underscore';
import {Spm, rmdir, SpmPackageMap, SpmPackage, SpmPackageConfig} from './lib/lib';

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

const PKG_NAME_VALUE = program.args[0] === undefined ? undefined : program.args[0];

export class UninstallCLI {

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
        console.log('UninstallCLI start.');
        await this._validate();
        await this._prepare();
        await this._comparison();
        await this._remove();
        await this._save();
        console.log('UninstallCLI complete.');
    }

    private async _validate() {
        console.log('UninstallCLI validate.');

        if (!PKG_NAME_VALUE) {
            throw new Error('name is required');
        }

        this._projectDir = Spm.getProjectDir();
        this._removePackage = {} as SpmPackage;
        try {
            let packageConfig = Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));
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
        console.log('UninstallCLI prepare.');

        this._spmPackageInstallDir = LibPath.join(this._projectDir, Spm.INSTALL_DIR_NAME);
        this._spmPackageInstalledMap = await Spm.getInstalledSpmPackageMap();
        this._removePackageDirMap = {};
    }

    private async _comparison() {
        console.log('UninstallCLI comparison.');

        this._findRemoveDir(this._removePackage.name, this._removePackage.version, this._spmPackageInstalledMap);
        this._checkInstalledDependencies(this._spmPackageInstalledMap);
    }

    private async _remove() {
        for (let dirname in this._removePackageDirMap) {
            await rmdir(LibPath.join(this._spmPackageInstallDir, this._removePackageDirMap[dirname]));
        }
    }

    private async _save() {
        console.log('UninstallCLI save.');

        await LibFs.writeFile(LibPath.join(this._projectDir, 'spm.json'),
            Buffer.from(JSON.stringify(this._packageOption, null, 2)));
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
    console.log('error:', err.message);
});
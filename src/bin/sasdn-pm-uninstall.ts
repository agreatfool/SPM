import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import * as program from 'commander';
import * as _ from 'underscore';
import {Spm, SpmPackage, SpmPackageConfig, SpmPackageMap, rmdir} from './lib/lib';

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

const PKG_NAME_VALUE = program.args[0] === undefined ? undefined : program.args[0];

export class UninstallCLI {

    private _projectDir: string;
    private _packageConfig: SpmPackageConfig;
    private _spmPackageInstalled: SpmPackageMap;
    private _spmPackageUninstall: SpmPackage;
    private _spmPackageUninstallDirnames: {[name: string]: string};

    static instance() {
        return new UninstallCLI();
    }

    public async run() {
        console.log('UninstallCLI start.');

        await this._validate();
        await this._prepare();
        await this._comparison();
        await this._uninstall();

        console.log('UninstallCLI complete.');
    }


    /**
     * 验证参数，数据，环境是否正确
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _validate() {
        console.log('UninstallCLI validate.');

        if (!PKG_NAME_VALUE) {
            throw new Error('name is required');
        }

        this._projectDir = Spm.getProjectDir();
        this._spmPackageUninstall = {} as SpmPackage;

        try {
            this._packageConfig = Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));
            if (this._packageConfig.dependencies.hasOwnProperty(PKG_NAME_VALUE)) {
                this._spmPackageUninstall = {
                    name: PKG_NAME_VALUE,
                    version: this._packageConfig.dependencies[PKG_NAME_VALUE]
                };

                delete this._packageConfig.dependencies[PKG_NAME_VALUE];
            }
        } catch (e) {
            throw new Error('ConfigFile: spm.json not found');
        }

        if (_.isEmpty(this._spmPackageUninstall)) {
            throw new Error('PkgName: ' + PKG_NAME_VALUE + ' not found in spm.json');
        }
    }

    /**
     * 准备命令中需要使用的参数，或创建文件夹。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _prepare() {
        console.log('UninstallCLI prepare.');

        this._spmPackageInstalled = await Spm.getInstalledSpmPackageMap();
        this._spmPackageUninstallDirnames = {};
    }

    /**
     * 比较需要删除的 package@version 是否被其他 package 依赖。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _comparison() {
        console.log('UninstallCLI comparison.');

        this._findRemoveDir(this._spmPackageUninstall.name, this._spmPackageUninstall.version);
        this._checkInstalledDependencies();
    }

    /**
     * 执行卸载
     * 1. 删除“卸载的包”和“卸载的包依赖”的文件夹。
     * 2. 修改 spm.json 中的依赖。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _uninstall() {
        for (let dirname in this._spmPackageUninstallDirnames) {
            await rmdir(LibPath.join(this._projectDir, Spm.INSTALL_DIR_NAME, this._spmPackageUninstallDirnames[dirname]));
        }
        await LibFs.writeFile(LibPath.join(this._projectDir, 'spm.json'), Buffer.from(JSON.stringify(this._packageConfig, null, 2)));
    }

    /**
     * 递归查询“卸载的包”和“卸载的包依赖”是否需要删除。
     * 1. 如果卸载的包，被其他包依赖，则不删除文件，仅从 spm.json 中删除依赖关系。
     * 2. 如果卸载的包的依赖，被其他包依赖，则不删除文件。
     *
     * @param {string} pkgName
     * @param {string} pkgVersion
     * @private
     */
    private _findRemoveDir(pkgName: string, pkgVersion: string) {
        let name = `${pkgName}@${pkgVersion}`;
        let [rmMajor] = pkgVersion.split('.');

        // 防止重复查询
        if (this._spmPackageUninstallDirnames.hasOwnProperty(name)) {
            return this._spmPackageUninstallDirnames;
        }

        // 防止删除被项目依赖的包
        if (this._packageConfig.dependencies.hasOwnProperty(pkgName)) {
            return this._spmPackageUninstallDirnames;
        }

        for (let dirname in this._spmPackageInstalled) {
            let spmPackage = this._spmPackageInstalled[dirname];
            let [instMajor] = spmPackage.version.split('.');
            if (pkgName == spmPackage.name && rmMajor == instMajor) {
                this._spmPackageUninstallDirnames[name] = dirname;
                for (let dependName in spmPackage.dependencies) {
                    this._findRemoveDir(dependName, spmPackage.dependencies[dependName]);
                }
            }
        }
    }

    /**
     * 检查需要删除的包，是否被其他包依赖。
     *
     * @private
     */
    private _checkInstalledDependencies() {

        // 创建临时对象，用来存放需要删除的“包路径”和“包版本”
        let removeDirs = {} as {[name: string]: string};
        let removePkgVersion = {} as {[name: string]: Array<string>};
        for (let name in this._spmPackageUninstallDirnames) {
            let [pkName, version] = name.split('@');
            if (!removePkgVersion.hasOwnProperty(pkName)) {
                removePkgVersion[pkName] = [];
            }

            removePkgVersion[pkName].push(version);
            removeDirs[this._spmPackageUninstallDirnames[name]] = name;
        }

        // 验证需要删除的包，是否被其他已经安装的包依赖。
        for (let dirname in this._spmPackageInstalled) {
            if (removeDirs.hasOwnProperty(dirname)) {
                continue;
            }

            let spmPackage = this._spmPackageInstalled[dirname];
            for (let name in spmPackage.dependencies) {
                if (removePkgVersion.hasOwnProperty(name)) {
                    for (let version of removePkgVersion[name]) {
                        let [instMajor] = spmPackage.dependencies[name].split('.');
                        let [rmMajor] = version.split('.');
                        if (rmMajor == instMajor) {
                            delete this._spmPackageUninstallDirnames[`${name}@${version}`];
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
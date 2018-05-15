import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import * as program from 'commander';
import * as unzip from 'unzip2';
import * as _ from 'underscore';
import * as recursive from 'recursive-readdir';
import * as readlineSync from 'readline-sync';

import {HttpRequest, mkdir, rmdir, Spm, SpmPackage, SpmPackageConfig, SpmPackageMap} from './lib/lib';

const pkg = require('../../package.json');

program.version(pkg.version)
    .usage('[Options] [<package>[@version]]')
    .description('install proto from spm server')
    .parse(process.argv);

const PKG_NAME_VALUE = program.args[0] === undefined ? undefined : program.args[0];

export class InstallCLI {
    private _tmpFilePath: string;
    private _tmpFileName: string;

    private _projectDir: string;
    private _packageConfig: SpmPackageConfig;
    private _packageDeployed: Map<string, boolean>;
    private _spmPackageInstalled: SpmPackageMap; // 已经安装的包
    private _spmPackageWillInstall: SpmPackageMap; // 即将安装的包

    static instance() {
        return new InstallCLI();
    }

    public async run() {
        console.log('InstallCLI start.');

        await this._prepare();
        await this._install();

        console.log('InstallCLI complete.');
        await Spm.checkVersion();
    }

    /**
     * 准备命令中需要使用的参数，或创建文件夹。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _prepare() {
        console.log('InstallCLI prepare.');

        this._projectDir = Spm.getProjectDir();
        this._packageConfig = Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));
        this._packageDeployed = new Map();
        this._spmPackageInstalled = await Spm.getInstalledSpmPackageMap();
        this._spmPackageWillInstall = {};

        // 创建临时文件夹，生成临时文件名
        this._tmpFilePath = LibPath.join(this._projectDir, 'tmp');
        this._tmpFileName = Math.random().toString(16) + '.zip';
        await mkdir(this._tmpFilePath);

        // 创建依赖包文件夹
        await mkdir(LibPath.join(this._projectDir, Spm.INSTALL_DIR_NAME));
    }

    /**
     * 执行安装
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _install() {
        let packageList = [] as Array<string>;
        if (!PKG_NAME_VALUE) {
            // MODE ONE: npm install
            for (let name in this._packageConfig.dependencies) {
                packageList.push(`${name}@${this._packageConfig.dependencies[name]}`);
            }
        } else {
            // MODE TWO: npm install ${pkgName}
            packageList.push(PKG_NAME_VALUE);
        }

        for (let pkgName of packageList) {
            let spmPackageDependMap = await this._getPkgDependcies(pkgName);
            await this._loopDependenciesAndCompare(spmPackageDependMap);
            await this._handleDependenciesConflict();
            await this._packageDeploy();
        }
        await rmdir(this._tmpFilePath);
    }

    /**
     * 访问 /v1/search_dependencies 获取需要安装的包的依赖
     *
     * @param {string} name
     * @returns {Promise<SpmPackageMap | {}>}
     * @private
     */
    private async _getPkgDependcies(name: string): Promise<SpmPackageMap | {}> {
        let params = {
            name: name,
        };
        return await HttpRequest.post('/v1/search_dependencies', params);
    }

    /**
     * 解决“安装的包”的依赖冲突问题
     *
     * @private
     */
    private _handleDependenciesConflict() {
        for (let dirname in this._spmPackageWillInstall) {
            this._spmPackageWillInstall[dirname].dependenciesChanged = {};
            for (let pkgName in  this._spmPackageWillInstall[dirname].dependencies) {
                let [dependMajor] = this._spmPackageWillInstall[dirname].dependencies[pkgName].split('.');
                let [installMajor] = this._spmPackageInstalled[pkgName].version.split('.');

                // 当需要安装的包依赖已经安装，并且其版本号的主版本号与已安装的依赖不相同，则更改需要安装的包依赖的pkgName
                if (this._spmPackageInstalled.hasOwnProperty(pkgName)) {
                    if (installMajor != dependMajor) {
                        this._spmPackageWillInstall[dirname].dependenciesChanged[pkgName] = `${pkgName}${Spm.SPM_VERSION_CONNECTOR}${dependMajor}`;
                    }
                }
            }
        }
    }

    /**
     * 遍历需要安装的包依赖，并对比版本号，确定是否需要重新安装。
     *
     * @param {SpmPackageMap} spmPackageDependMap
     * @returns {Promise<void>}
     * @private
     */
    private async _loopDependenciesAndCompare(spmPackageDependMap: SpmPackageMap) {
        for (let fullName in spmPackageDependMap) {
            let spmPackageDepend = spmPackageDependMap[fullName];

            // 对比“依赖版本”与“当前版本”的 package 的版本。
            this._comparisonWillInstall(spmPackageDepend);

            // 修改 spm.json 的依赖关系。
            if (spmPackageDepend.isDependencies == false) {
                // 如果当前版本已经存在，则跳过。
                if (this._packageConfig.dependencies.hasOwnProperty(spmPackageDepend.name)
                    && this._packageConfig.dependencies[spmPackageDepend.name] == spmPackageDepend.version) {
                    continue;
                }

                // 写入依赖关系
                this._packageConfig.dependencies[spmPackageDepend.name] = spmPackageDepend.version;
                await LibFs.writeFile(LibPath.join(this._projectDir, 'spm.json'), Buffer.from(JSON.stringify(this._packageConfig, null, 2)));
            }
        }
    }

    /**
     * 对比“依赖版本”与“当前版本”的 package 的版本。
     * 1. 依赖版本 minor.patch 低于当前版本，则不处理
     * 2. 依赖版本 minor.patch 高于当前版本，则下载
     * 3. 依赖版本 major 高于当前版本，则给出警告，并询问使用者采用覆盖安装还是采用版本冲突安装方案安装
     * 4. 依赖版本 major 低于当前版本，采用版本冲突安装方案安装
     *
     * @param {SpmPackage} spmPackage
     * @param deepLevel
     * @param {string} changeName
     * @returns {SpmPackageMap}
     * @private
     */
    private _comparisonWillInstall(spmPackage: SpmPackage, deepLevel: number = 0, changeName?: string) {
        let dirname = (changeName) ? changeName : spmPackage.name;

        if (this._spmPackageInstalled.hasOwnProperty(dirname)) {
            let [nextMajor, nextMinor, nextPatch] = spmPackage.version.split('.');
            let [curMajor, curMinor, curPath] = this._spmPackageInstalled[dirname].version.split('.');

            if (nextMajor == curMajor) {
                // 主版本号相同
                if (nextMinor < curMinor || nextMinor == curMinor && nextPatch <= curPath) {
                    // 依赖版本低于或等于当前版本，不处理，其他情况都要重新下载
                } else {
                    this._spmPackageInstalled[dirname] = spmPackage;
                    this._spmPackageWillInstall[dirname] = spmPackage;
                }
            } else if (nextMajor > curMajor) {
                // 依赖版本 major 高于当前版本
                console.log(
                    `\nWarning: The version of package [${spmPackage.name}] you are going to install is [${spmPackage.version}] ` +
                    `while your local version is [${this._spmPackageInstalled[dirname].version}], which causes confict.` +
                    `There are two ways to resolve the confict: 1. Overwrite current package 2. Rename new version.` +
                    `If you overwrite the current package, you should change logic of some interface. If you choose [n],` +
                    `the two version will coexist and the new installed one will be renamed. ChangeLog in spm.json may be helpful.\n`,
                );
                let flag: string = '';
                while (['y', 'yes', 'n', 'no'].indexOf(flag) === -1) {
                    flag = readlineSync.question(`Are you sure to overwrite the current package [${spmPackage.name}] or rename new version? (y/n)`);
                    flag = flag.toLowerCase();
                }
                if (flag === 'y' || flag === 'yes') {
                    this._spmPackageInstalled[dirname] = spmPackage;
                    this._spmPackageWillInstall[dirname] = spmPackage;
                } else {
                    if (deepLevel === 0) {
                        this._comparisonWillInstall(spmPackage, 1, `${spmPackage.name}${Spm.SPM_VERSION_CONNECTOR}${nextMajor}`);
                    }
                }
            } else {
                // 依赖版本 major 低于当前版本
                if (deepLevel === 0) {
                    this._comparisonWillInstall(spmPackage, 1, `${spmPackage.name}${Spm.SPM_VERSION_CONNECTOR}${nextMajor}`);
                }
            }
        } else {
            this._spmPackageInstalled[dirname] = spmPackage;
            this._spmPackageWillInstall[dirname] = spmPackage;
        }
    }

    /**
     * 部署 package
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _packageDeploy() {
        for (let dirname in this._spmPackageWillInstall) {
            let tmpName = dirname + this._tmpFileName;
            let tmpZipPath = LibPath.join(this._tmpFilePath, tmpName);
            let tmpPkgPath = LibPath.join(this._tmpFilePath, dirname);

            // download file
            let spmPackage = this._spmPackageWillInstall[dirname];
            let spmPackageName = `${spmPackage.name}@${spmPackage.version}`;

            if (this._packageDeployed.get(spmPackageName) !== true) {
                await this._packageDownload(spmPackage, tmpZipPath);
                await this._packageUncompress(tmpZipPath, tmpPkgPath);
                await this._packageReplaceName(dirname, spmPackage, tmpPkgPath);
                await this._packageCopy(dirname, tmpPkgPath);
                this._packageDeployed.set(spmPackageName, true);
                console.log(`Package：${spmPackageName} complete!`);
            }
        }
    }

    /**
     * 访问 /v1/install 下载 package 压缩文件
     *
     * @param {SpmPackage} spmPackage
     * @param {string} tmpZipPath
     * @returns {Promise<void>}
     * @private
     */
    private async _packageDownload(spmPackage: SpmPackage, tmpZipPath: string): Promise<void> {
        let params = {
            path: spmPackage.downloadUrl,
        };

        await HttpRequest.download(`/v1/install`, params, tmpZipPath);
    }

    /**
     * 将下载的 package 压缩文件进行解压缩，完成后删除压缩文件
     *
     * @param {string} tmpZipPath
     * @param {string} tmpPkgPath
     * @returns {Promise<void>}
     * @private
     */
    private _packageUncompress(tmpZipPath: string, tmpPkgPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (LibFs.statSync(tmpZipPath).isFile()) {
                LibFs.createReadStream(tmpZipPath)
                    .pipe(unzip.Extract({path: tmpPkgPath})
                        .on('close', () => {
                            LibFs.unlinkSync(tmpZipPath);
                            resolve();
                        }));
            } else {
                LibFs.unlinkSync(tmpZipPath);
                reject(new Error('Download file corruption.'));
            }
        });
    }

    /**
     * 将已经下载并完成修改的文件内容，拷贝到项目的 spm_protos 中
     *
     * @param {string} dirname
     * @param {string} tmpPkgPath
     * @returns {Promise<void>}
     * @private
     */
    private async _packageCopy(dirname: string, tmpPkgPath: string): Promise<void> {
        let packageDir = LibPath.join(LibPath.join(this._projectDir, Spm.INSTALL_DIR_NAME), dirname);
        if (LibFs.existsSync(packageDir) && LibFs.statSync(packageDir).isDirectory()) {
            await rmdir(packageDir);
        }

        await LibFs.rename(tmpPkgPath, packageDir);
    }

    /**
     * 根据 dependenciesChanged 内容，根据 key 值，替换已下载的包中的 proto 文件。
     * 1. proto 文件的包名与 key 值相同，则进行替换，eg:
     *      package order；=> package order__v1;
     * 2. proto 文件中 import 了 key 值相同的包名，则进行替换，eg：
     *      import order/ => import order__v1/
     *      (order.***) => (order__v1.***)
     *      order.*** => order__v1.***
     *
     * @param {string} dirname
     * @param {SpmPackage} spmPackage
     * @param {string} tmpPkgPath
     * @returns {Promise<void>}
     * @private
     */
    private async _packageReplaceName(dirname: string, spmPackage: SpmPackage, tmpPkgPath: string): Promise<void> {

        if (_.isEmpty(spmPackage.dependenciesChanged) && spmPackage.name == dirname) {
            return Promise.resolve();
        } else {
            const files = await recursive(tmpPkgPath, ['.DS_Store']);
            let count = 0;
            for (let file of files) {
                count++;
                if (LibPath.basename(file).match(/.+\.proto/) !== null) {
                    if (spmPackage.name != dirname) {
                        await Spm.replaceStringInFile(file, [
                            [new RegExp(`package ${spmPackage.name};`, 'g'), `package ${dirname};`],
                        ]);
                    }

                    for (let oldString in spmPackage.dependenciesChanged) {
                        let newString = spmPackage.dependenciesChanged[oldString];
                        await Spm.replaceStringInFile(file, [
                            [new RegExp(`import "${oldString}/`, 'g'), `import "${newString}/`],
                            [new RegExp(`\\((${oldString}.*?)\\)`, 'g'), (word) => word.replace(oldString, newString)],
                            [new RegExp(` (${oldString}.*?) `, 'g'), (word) => word.replace(oldString, newString)],
                        ]);
                    }
                }

                if (count == files.length) {
                    return Promise.resolve();
                }
            }
        }
    }
}

InstallCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});

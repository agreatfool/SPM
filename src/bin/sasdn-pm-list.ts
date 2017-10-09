import * as program from 'commander';
import * as LibPath from 'path';
import {Spm} from './lib/lib';

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

export class ListCLI {
    private _projectDir: string;

    static instance() {
        return new ListCLI();
    }

    public async run() {
        console.log('ListCLI start.');

        await this._prepare();
        await this._displayPackageList();

        console.log('ListCLI complete.');
    }

    /**
     * 准备命令中需要使用的参数，或创建文件夹。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _prepare() {
        console.log('ListCLI prepare.');

        this._projectDir = Spm.getProjectDir();
    }

    /**
     * 显示所有已安装的 package
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _displayPackageList() {
        console.log('ListCLI show.');

        let spmPackageMap = await Spm.getInstalledSpmPackageMap();

        console.log('--------------Installed SpmPackage---------------');
        for (let dirname in spmPackageMap) {
            let spmPackage = spmPackageMap[dirname];
            console.log(`+-- ${spmPackage.name}@${spmPackage.version}`);
            for (let dependName in spmPackage.dependencies) {
                console.log(`|  | -- ${dependName}@${spmPackage.dependencies[dependName]}`);
            }
        }
        console.log('--------------Installed SpmPackage---------------');
    }

}

ListCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});
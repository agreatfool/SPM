import * as program from 'commander';
import {Spm, SpmPackageMap} from './lib/lib';

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

const KEYWORK_VALUE = program.args[0]

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
        if (KEYWORK_VALUE !== undefined) {
            this._displayPackage(KEYWORK_VALUE, spmPackageMap);
        } else {
            for (let dirname in spmPackageMap) {
                this._displayPackage(dirname, spmPackageMap);
            }
        }
        console.log('--------------Installed SpmPackage---------------');
    }

    /**
     * 显示名字为 packageName 的已安装的 package
     * @param {string} packageName
     * @param {SpmPackageMap} spmPackageMap
     * @private
     */
    private _displayPackage(packageName: string, spmPackageMap: SpmPackageMap): void {
        let spmPackage = spmPackageMap[packageName];
        if (!spmPackage) {
          throw new Error(`${packageName} not exist in SpmPackageList.`);
        }
        let depLength = Object.keys(spmPackage.dependencies).length;
        if (depLength !== 0) {
            console.log(`├─┬ ${spmPackage.name}@${spmPackage.version}`);
        } else {
            console.log(`├── ${spmPackage.name}@${spmPackage.version}`);
        }
        let count = 0;
        for (let dependName in spmPackage.dependencies) {
            count += 1;
            if (count !== depLength) {
                console.log(`│ ├── ${dependName}@${spmPackage.dependencies[dependName]}`);
            } else {
                console.log(`│ └── ${dependName}@${spmPackage.dependencies[dependName]}`);
            }
        }
    }

}

ListCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});

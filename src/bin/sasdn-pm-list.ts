import * as program from 'commander';
import * as LibPath from 'path';
import {Spm} from './lib/lib';

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

export class ListCLI {
    private _projectDir: string;
    private _spmPackageInstallDir: string;

    static instance() {
        return new ListCLI();
    }

    public async run() {
        console.log('ListCLI start.');
        await this._prepare();
        await this._show();
        console.log('ListCLI complete.');
    }

    private async _prepare() {
        console.log('ListCLI prepare.');
        this._projectDir = Spm.getProjectDir();
        this._spmPackageInstallDir = LibPath.join(this._projectDir, Spm.INSTALL_DIR_NAME);
    }

    private async _show() {
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
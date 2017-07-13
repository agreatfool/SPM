import * as program from "commander";
import * as LibPath from "path";
import {Spm} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:list');

program.version(pkg.version)
    .option('-p, --projectDir <dir>', 'project dir')
    .parse(process.argv);

const PROJECT_DIR_VALUE = (program as any).projectDir === undefined ? undefined : (program as any).projectDir;

class ListCLI {
    private _projectDir: string;
    private _spmPackageInstallDir: string;

    static instance() {
        return new ListCLI();
    }

    public async run() {
        debug('ListCLI start.');
        await this._prepare();
        await this._show();
    }

    private async _prepare() {
        debug('ListCLI prepare.');

        if (!PROJECT_DIR_VALUE) {
            this._projectDir = Spm.getProjectDir();
        } else {
            this._projectDir = PROJECT_DIR_VALUE;
        }

        this._spmPackageInstallDir = LibPath.join(this._projectDir, Spm.INSTALL_DIR_NAME);
    }

    private async _show() {
        debug('ListCLI show.');

        let spmPackageMap = await Spm.getInstalledSpmPackageMap(this._spmPackageInstallDir);

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
    debug('err: %O', err.message);
});
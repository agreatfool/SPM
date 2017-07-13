import * as program from "commander";
import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as recursive from "recursive-readdir";
import {findProjectDir, SpmPackageInstalled, SpmPackageOption} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:uninstall');

program.version(pkg.version)
    .option('-n, --name <item>', 'package name')
    .option('-p, --projectDir <dir>', 'project dir')
    .parse(process.argv);

const NAME_VALUE = (program as any).name === undefined ? undefined : (program as any).name;
const PROJECT_DIR_VALUE = (program as any).projectDir === undefined ? undefined : (program as any).projectDir;

class UninstallCLI {
    private _projectDir: string;
    private _projectProtoDir: string;
    private _projectInstalled: { [dirName: string]: [string, string, string] };

    static instance() {
        return new UninstallCLI();
    }

    public async run() {
        debug('UninstallCLI start.');
        await this._validate();
        await this._initLocaleInfo();
    }

    private async _validate() {
        debug('UninstallCLI validate.');

        if (!NAME_VALUE) {
            throw new Error('--name is required');
        }

        // 向上查找项目文件夹根目录
        if (!PROJECT_DIR_VALUE) {
            this._projectDir = findProjectDir(__dirname);
        } else {
            this._projectDir = PROJECT_DIR_VALUE;
        }
    }

    private async _initLocaleInfo() {
        debug('UninstallCLI search.');

        // 查找spm_protos文件夹是否存在，不存在则不需要卸载
        this._projectProtoDir = LibPath.join(this._projectDir, "spm_protos");

        let protoDirStat = await LibFs.stat(this._projectProtoDir);
        if (protoDirStat.isDirectory()) {
            let files = await recursive(this._projectProtoDir, [".DS_Store"]);
            for (let file of files) {
                let basename = LibPath.basename(file);
                if (basename.match(/.+\.json/) !== null) {
                    let name = LibPath.dirname(file).replace(this._projectProtoDir, '').replace('\\', '').replace('/', '');
                    let packageOption = JSON.parse(LibFs.readFileSync(file).toString()) as SpmPackageOption;
                    let [major, minor, patch] = packageOption.version.split('.');
                    this._projectInstalled[name] = [major, minor, patch];
                }
            }
        }
    }
}

UninstallCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
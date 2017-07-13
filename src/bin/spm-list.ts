import * as program from "commander";
import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as recursive from "recursive-readdir";
import {findProjectDir, SpmPackageOption} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:uninstall');

program.version(pkg.version)
    .option('-p, --projectDir <dir>', 'project dir')
    .parse(process.argv);

const PROJECT_DIR_VALUE = (program as any).projectDir === undefined ? undefined : (program as any).projectDir;

class ListCLI {
    private _projectDir: string;
    private _projectProtoDir: string;
    private _projectInstalled: {
        [dirName: string]: {
            name: string;
            version: string;
            dependencies: {
                [key: string]: string;
            }
        }
    };

    static instance() {
        return new ListCLI();
    }

    public async run() {
        debug('ListCLI start.');
        await this._loopSpmProtoDir();
        await this._show();
    }

    private async _loopSpmProtoDir() {
        debug('ListCLI loopSpmProtoDir.');

        // 向上查找项目文件夹根目录
        if (!PROJECT_DIR_VALUE) {
            this._projectDir = findProjectDir(__dirname);
        } else {
            this._projectDir = PROJECT_DIR_VALUE;
        }

        // 查找spm_protos文件夹是否存在，不存在则不需要卸载
        this._projectInstalled = {};
        this._projectProtoDir = LibPath.join(this._projectDir, "spm_protos");

        let protoDirStat = await LibFs.stat(this._projectProtoDir);
        if (protoDirStat.isDirectory()) {
            let files = await recursive(this._projectProtoDir, [".DS_Store"]);
            for (let file of files) {
                let basename = LibPath.basename(file);
                if (basename.match(/.+\.json/) !== null) {
                    let dirname = LibPath.dirname(file).replace(this._projectProtoDir, '').replace('\\', '').replace('/', '');
                    let packageOption = JSON.parse(LibFs.readFileSync(file).toString()) as SpmPackageOption;
                    this._projectInstalled[dirname] = {
                        name: packageOption.name,
                        version: packageOption.version,
                        dependencies: packageOption.dependencies
                    };
                }
            }
        }
    }

    private async _show() {
        debug('ListCLI show.');

        for (let dirname in this._projectInstalled) {
            let protoInfo = this._projectInstalled[dirname];
            console.log(`+-- ${protoInfo.name}@${protoInfo.version}`);

            for (let dependName in protoInfo.dependencies) {
                console.log(`|  | -- ${dependName}@${protoInfo.dependencies[dependName]}`);
            }
        }
    }
}

ListCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
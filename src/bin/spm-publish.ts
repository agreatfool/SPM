import * as LibFs from "mz/fs";
import * as LibPath from "path";
import * as program from "commander";
import * as archiver from "archiver";
import * as http from "http";
import * as _ from "underscore";
import {Spm, SpmPackageRequest, RequestMethod, SpmPackageConfig, mkdir} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:publish');

program.version(pkg.version)
    .option('-i, --import <dir>', 'directory of source proto files for publish to spm server')
    .parse(process.argv);

const IMPORT_DIR = (program as any).import === undefined ? undefined : LibPath.normalize((program as any).import);

class PublishCLI {
    private _packageConfig: SpmPackageConfig;
    private _tmpDir: string;
    private _tmpFileName: string;

    static instance() {
        return new PublishCLI();
    }

    public async run() {
        debug('PublishCLI start.');

        await this._validate();
        await this._prepare();
        await this._compress();
        await this._publish();
    }

    private async _validate() {
        debug('PublishCLI validate.');

        if (!IMPORT_DIR) {
            throw new Error('--import is required');
        }

        let importStat = await LibFs.stat(IMPORT_DIR);
        if (!importStat.isDirectory()) {
            throw new Error('--import is not a directory');
        }
    }

    private async _prepare() {
        debug('PublishCLI prepare.');

        let importFiles = await LibFs.readdir(IMPORT_DIR);
        if (importFiles.indexOf('spm.json') < 0) {
            throw new Error('File: `spm.json` not found in import directory:' + IMPORT_DIR);
        }

        this._packageConfig = Spm.getSpmPackageConfig(LibPath.join(IMPORT_DIR, 'spm.json'));

        if (!this._packageConfig.name || _.isEmpty(this._packageConfig.name) || typeof this._packageConfig.name !== 'string') {
            throw new Error('Package param: `name` is required');
        }

        if (!this._packageConfig.version || _.isEmpty(this._packageConfig.version) || typeof this._packageConfig.version !== 'string') {
            throw new Error('Package param: `version` is required');
        }

        this._tmpDir = LibPath.join(Spm.SPM_ROOT_PATH, 'tmp');
        this._tmpFileName = Math.random().toString(16) + ".zip";
        await mkdir(this._tmpDir);
    }

    private async _compress() {
        debug('PublishCLI compress.');

        let tmpFilePath = LibPath.join(this._tmpDir, this._tmpFileName);

        // create a file to stream archive data to.
        await new Promise((resolve, reject) => {
            // create write stream
            let writeStream = LibFs.createWriteStream(tmpFilePath)
                .on("close", () => resolve());
            // archive init
            let archive = archiver('zip', {zlib: { level: 9 }})
                .on('error', (err) => reject(err));

            archive.pipe(writeStream);
            archive.directory(IMPORT_DIR, false);
            archive.finalize();
        });

        debug('PublishCLI compress finish.');
    }

    private async _publish() {
        debug('PublishCLI publish.');

        let tmpFilePath = LibPath.join(this._tmpDir, this._tmpFileName);

        await new Promise(async (resolve, reject) => {
            // build params
            let params = {
                name: this._packageConfig.name,
                version: this._packageConfig.version,
                dependencies: JSON.stringify(this._packageConfig.dependencies),
                secret: Spm.loadSecret(),
            };

            let filePath = [tmpFilePath];

            SpmPackageRequest.postFormRequest('/v1/publish', params, filePath, async (chunk) => {

                try {
                    debug(`PublishCLI publish: [Response] - ${chunk}`);

                    if (filePath.length > 0) {
                        await LibFs.unlink(filePath[0]);
                    }

                    resolve();
                } catch (e) {
                    reject(e);
                }

            });
        });
    };
}

PublishCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
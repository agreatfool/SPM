import * as LibFs from "mz/fs";
import * as LibPath from "path";
import * as program from "commander";
import * as archiver from "archiver";
import * as _ from "underscore";
import * as request from "./lib/request";
import {Spm, SpmPackageConfig, mkdir} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:publish');

program.version(pkg.version)
    .parse(process.argv);

export class PublishCLI {
    private _projectDir: string;
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
        debug('PublishCLI complete.');
        console.log("PublishCLI complete.");
    }

    private async _validate() {
        debug('PublishCLI validate.');

        this._projectDir = Spm.getProjectDir();

        let configStat = await LibFs.stat(LibPath.join(this._projectDir, 'spm.json'));
        if (!configStat.isFile()) {
            throw new Error('File: `spm.json` not found in project:' + this._projectDir);
        }

        let protoStat = await LibFs.stat(LibPath.join(this._projectDir, 'proto'));
        if (!protoStat.isDirectory()) {
            throw new Error('Dir: `proto` not found in project:' + this._projectDir);
        }
    }

    private async _prepare() {
        debug('PublishCLI prepare.');

        this._packageConfig = Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));

        if (!this._packageConfig.name || _.isEmpty(this._packageConfig.name) || typeof this._packageConfig.name !== 'string') {
            throw new Error('Package param: `name` is required');
        }

        if (!this._packageConfig.version || _.isEmpty(this._packageConfig.version) || typeof this._packageConfig.version !== 'string') {
            throw new Error('Package param: `version` is required');
        }

        let packageStat = await LibFs.stat(LibPath.join(this._projectDir, 'proto', this._packageConfig.name));
        if (!packageStat.isDirectory()) {
            throw new Error(`Dir: ${this._packageConfig.name} not found in project:' + this._projectDir`);
        }

        this._tmpDir = LibPath.join(Spm.SPM_ROOT_PATH, 'tmp');
        this._tmpFileName = Math.random().toString(16) + '.zip';
        await mkdir(this._tmpDir);
    }

    private async _compress() {
        debug('PublishCLI compress.');

        let tmpFilePath = LibPath.join(this._tmpDir, this._tmpFileName);

        // create a file to stream archive data to.
        await new Promise(async (resolve, reject) => {
            // create write stream
            let writeStream = LibFs.createWriteStream(tmpFilePath)
                .on('close', () => {
                    resolve();
                });
            // archive init
            let archive = archiver('zip', {zlib: {level: 9}})
                .on('error', (err) => reject(err)) as archiver.Archiver;

            archive.pipe(writeStream);
            archive.directory(LibPath.join(this._projectDir, 'proto', this._packageConfig.name), false);
            archive.append(LibFs.createReadStream(LibPath.join(this._projectDir, 'spm.json')), {name: 'spm.json'});
            await archive.finalize();
        });
    }

    private async _publish() {
        debug('PublishCLI publish.');

        let tmpFilePath = LibPath.join(this._tmpDir, this._tmpFileName);

        await new Promise(async (resolve, reject) => {
            // build params
            let params = {
                name: this._packageConfig.name,
                version: this._packageConfig.version,
                description: this._packageConfig.description || '',
                dependencies: JSON.stringify(this._packageConfig.dependencies),
                secret: Spm.loadSecret(),
            };

            let filePath = [tmpFilePath];
            await request.postForm('/v1/publish', params, filePath, async (chunk, reqResolve) => {
                debug(`PublishCLI publish: [Response] - ${chunk}`);
                reqResolve();
            }).then(async () => {
                if (filePath.length > 0) {
                    await LibFs.unlink(filePath[0]);
                }

                resolve();
            }).catch(async (e) => {
                if (filePath.length > 0) {
                    await LibFs.unlink(filePath[0]);
                }

                reject(e);
            });
        });
    };
}

PublishCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
    console.log(err.message);
});
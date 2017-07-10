import * as LibFs from "mz/fs";
import * as LibPath from "path";
import * as program from "commander";
import * as archiver from "archiver";
import * as http from "http";
import * as _ from "underscore";
import {SpmHttp, RequestMethod, SpmPackageOption} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:publish');

program.version(pkg.version)
    .option('-i, --import <dir>', 'directory of source proto files for publish to spm server')
    .parse(process.argv);

const IMPORT_DIR = (program as any).import === undefined ? undefined : LibPath.normalize((program as any).import);

class PublishCLI {
    private _packageOption: SpmPackageOption;
    private _tmpZipPath: string;

    static instance() {
        return new PublishCLI();
    }

    public async run() {
        debug('PublishCLI start.');
        await this._validate();
        await this._load();
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

    private async _load() {
        let importFiles = await LibFs.readdir(IMPORT_DIR);
        if (importFiles.indexOf('spm.json') < 0) {
            throw new Error('File: `spm.json` not found in import dir:' + IMPORT_DIR);
        }

        let packageStr = await LibFs.readFileSync(LibPath.join(IMPORT_DIR, 'spm.json')).toString();

        try {
            this._packageOption = JSON.parse(packageStr);
        } catch (e) {
            throw new Error(`Error: ${e.message}`);
        }

        if (!this._packageOption.name || _.isEmpty(this._packageOption.name) || typeof this._packageOption.name !== 'string') {
            throw new Error('Package param: `name` is required');
        }

        if (!this._packageOption.version || _.isEmpty(this._packageOption.version) || typeof this._packageOption.version !== 'string') {
            throw new Error('Package param: `version` is required');
        }

        this._tmpZipPath = LibPath.join(__dirname, '..', '..', 'tmp', `${this._packageOption.name}@${this._packageOption.version}.zip`)
    }

    private async _compress() {
        debug('PublishCLI compress.');

        // create a file to stream archive data to.
        let archive = archiver('zip', {zlib: { level: 9 }});
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                debug("Archive waring:" + err.message)
            } else {
                throw err;
            }
        });
        archive.on('error', (err) => {
            throw err;
        });
        archive.pipe(LibFs.createWriteStream(this._tmpZipPath));
        archive.directory(IMPORT_DIR, false);
        archive.finalize();
    }

    private async _publish() {
        debug('PublishCLI publish.');

        let reqParams = {
            name: this._packageOption.name,
            version: this._packageOption.version,
        };

        let reqOptions = await SpmHttp.getRequestOption("/v1/publish", reqParams, RequestMethod.post);
        let req = http.request(reqOptions, (res) => {
            res.on('data', (chunk) => {
                debug('PublishCLI publish result: ' + chunk);
            });
        });

        req.on('error', (e) => {
            debug('PublishCLI publish failed: ' + e.message);
        });

        await SpmHttp.uploadFiles(this._tmpZipPath, this._packageOption, req);
    };

}

PublishCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
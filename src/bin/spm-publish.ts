import * as LibFs from "mz/fs";
import * as LibPath from "path";
import * as program from "commander";
import * as archiver from "archiver";
import * as http from "http";
import * as _ from "underscore";
import {SpmHttp, RequestMethod, SpmPackageOption, SpmSecret} from "./lib/lib";

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
        debug('PublishCLI load.');

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

        this._tmpZipPath = LibPath.join(__dirname, '..', '..', 'tmp', Math.random().toString(16) + ".zip");
    }

    private async _compress() {
        debug('PublishCLI compress.');

        // create a file to stream archive data to.
        await new Promise((resolve, reject) => {
            let output = LibFs.createWriteStream(this._tmpZipPath).on("close", () => {
                debug('PublishCLI compress finish.');
                resolve();
            });

            let archive = archiver('zip', {zlib: { level: 9 }});
            archive.on('warning', (err) => {
                if (err.code === 'ENOENT') {
                    debug("Archive waring:" + err.message)
                } else {
                    reject(err);
                }
            });
            archive.on('error', (err) => {
                reject(err);
            });
            archive.pipe(output);
            archive.directory(IMPORT_DIR, false);
            archive.finalize();
        });
    }

    private async _publish() {
        debug('PublishCLI publish.');

        await new Promise(async (resolve, reject) => {
            // build header
            let reqParams = {
                name: this._packageOption.name,
                version: this._packageOption.version,
                dependencies: JSON.stringify(this._packageOption.dependencies),
                secret: SpmSecret.load(),
            };

            let boundaryKey = Math.random().toString(16);
            let enddata = '\r\n----' + boundaryKey + '--';
            let content = '';
            for (let key in reqParams) {
                content += '\r\n----' + boundaryKey + '\r\n'
                    + 'Content-Disposition: form-data; name="' + key +'" \r\n\r\n'
                    + encodeURIComponent(reqParams[key]);
            }

            content += '\r\n----' + boundaryKey + '\r\n'
                + 'Content-Type: application/octet-stream\r\n'
                + 'Content-Disposition: form-data; name="fileUpload"; filename="' + `${reqParams.name}@${reqParams.version}.zip` + '"\r\n'
                + "Content-Transfer-Encoding: binary\r\n\r\n";
            let contentBinary = new Buffer(content, 'utf-8');
            let contentLength = LibFs.statSync(this._tmpZipPath).size + contentBinary.length;

            // create request
            let reqOptions = await SpmHttp.getRequestOption('/v1/publish', RequestMethod.post);
            let req = http.request(reqOptions, (res) => {
                res.on('data', async (chunk) => {
                    debug(`PublishCLI publish: [Response] - ${chunk}`);
                    await LibFs.unlink(this._tmpZipPath);
                    resolve();
                });
            }).on('error', (e) => reject(e));

            // send request headers
            req.setHeader('Content-Type', 'multipart/form-data; boundary=--' + boundaryKey);
            req.setHeader('Content-Length', `${contentLength + Buffer.byteLength(enddata)}`);
            req.write(contentBinary);

            // send request stream
            let fileStream = LibFs.createReadStream(this._tmpZipPath);
            fileStream.on('end', () => {
                req.end(enddata);
                debug(`PublishCLI publish finish.`);
            });
            fileStream.pipe(req, { end: false });
        });
    };
}

PublishCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
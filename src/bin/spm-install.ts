import * as program from "commander";
import * as LibPath from "path";
import * as LibFs from "mz/fs";
import {RequestMethod, SpmHttp} from "./lib/lib";
import * as http from "http";
import * as qs from "querystring";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:install');

program.version(pkg.version)
    .option('-n, --name <item>', 'package name')
    .parse(process.argv);

const NAME_VALUE = (program as any).name === undefined ? undefined : (program as any).name;

class InstallCLI {

    private _tmpZipPath: string;

    static instance() {
        return new InstallCLI();
    }

    public async run() {
        debug('InstallCLI start.');
        await this._validate();
        await this._download();
        await this._uncompress();
    }

    private async _validate() {
        debug('InstallCLI validate.');

        if (!NAME_VALUE) {
            throw new Error('--name is required');
        }
    }

    private async _download() {
        debug('InstallCLI download.');

        this._tmpZipPath = LibPath.join(__dirname, '..', '..', 'tmp', Math.random().toString(16) + ".zip");
        let stream = LibFs.createWriteStream(this._tmpZipPath).on("close", () => {
            debug("InstallCLI download finish!")
        });
        let reqOptions = await SpmHttp.getRequestOption('/v1/install', RequestMethod.post);
        let req = await http.request(reqOptions, (res) => {
            if (res.headers['content-type'] == 'application/octet-stream') {
                res.pipe(stream);
            } else {
                res.on("data", (chunk) => {
                    debug(`[Request] - chunk:${chunk}`);
                })
            }
        }).on('error', (e) => {
            debug(`[RequestError] - error:${e.message}`);
        });

        let reqParamsStr = qs.stringify({
            name: NAME_VALUE,
        });

        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
        req.write(reqParamsStr);

        //await LibFs.unlink(downloadFile);
    }

    private async _uncompress() {
        debug('InstallCLI uncompress.');

        let fileStat = await LibFs.stat(this._tmpZipPath);
        if (fileStat.isFile()) {
            console.log(fileStat.size);
        } else {

        }
    }
}

InstallCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
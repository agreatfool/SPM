import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as program from "commander";
import * as _ from "underscore";
import {Spm, SpmPackageConfig, SpmPackageRequest} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:secret');

program.version(pkg.version)
    .parse(process.argv);

class SecretCLI {

    private _projectDir: string;
    private _packageConfig: SpmPackageConfig;

    static instance() {
        return new SecretCLI();
    }

    public async run() {
        debug('SecretCLI start.');
        await this._validate();
        await this._save();
    }

    private async _validate() {
        debug('SecretCLI validate.');

        this._projectDir = Spm.getProjectDir();

        let configStat = await LibFs.stat(LibPath.join(this._projectDir, 'spm.json'));
        if (!configStat.isFile()) {
            throw new Error('File: `spm.json` not found in project:' + this._projectDir);
        }

        this._packageConfig = Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));
        if (!this._packageConfig.name || _.isEmpty(this._packageConfig.name) || typeof this._packageConfig.name !== 'string') {
            throw new Error('Package param: `name` is required');
        }

    }

    private async _save() {
        debug('SecretCLI save.');

        await new Promise(async (resolve, reject) => {

            let params = {
                name: this._packageConfig.name
            };

            SpmPackageRequest.postRequest('/v1/secret', params, async (chunk) => {

                try {
                    let response = SpmPackageRequest.parseResponse(chunk) as { secret: string };
                    await Spm.saveSecret(response.secret);
                    resolve();
                } catch (e) {
                    reject(e);
                }

            });
        });
    }
}

SecretCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
import * as program from "commander";
import {SpmSecret} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:secret');

program.version(pkg.version)
    .option('-s, --secret <item>', 'secret value')
    .parse(process.argv);

const SECRET_VALUE = (program as any).secret === undefined ? undefined : (program as any).secret;

class SecretCLI {

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

        if (!SECRET_VALUE) {
            throw new Error('--secret is required');
        }
    }

    private async _save() {
        debug('SecretCLI save.');

        await SpmSecret.save(SECRET_VALUE)
    }
}

SecretCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
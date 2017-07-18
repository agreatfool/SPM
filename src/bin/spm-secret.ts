import * as program from "commander";
import {Spm} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:secret');

program.version(pkg.version)
    .parse(process.argv);

const SECRET_VALUE = program.args[0] === undefined ? undefined : program.args[0];

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
            throw new Error('secretKey is required');
        }
    }

    private async _save() {
        debug('SecretCLI save.');

        await Spm.saveSecret(SECRET_VALUE);
    }
}

SecretCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
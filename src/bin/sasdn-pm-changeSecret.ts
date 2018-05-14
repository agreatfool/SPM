import * as program from 'commander';
import {HttpRequest} from "./lib/lib";

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

const PKG_NAME: string = program.args[0];
const USER_SECRET: string = program.args[1];
const PKG_SECRET: string = program.args[2];

export class ChangeSecretCLI {

    static instance() {
        return new ChangeSecretCLI();
    }

    public async run() {
        console.log('ChangeSecretCLI start.');
        this._validateParams();
        await this._deletePackage();
    }

    private _validateParams(): void {
        if (!PKG_NAME) {
            throw new Error('Please input package name!');
        }
        if (!USER_SECRET) {
            throw new Error('Please input password!');
        }
        if (!PKG_SECRET) {
            throw new Error('Please input package secret!');
        }
    }

    /**
     * 修改中心节点的包的密钥
     * @returns {Promise<void>}
     * @private
     */
    private async _deletePackage(): Promise<void> {
        await HttpRequest.post('/v1/change_secret', {
            packageName: PKG_NAME,
            userSecret: USER_SECRET,
            pkgSecret: PKG_SECRET,
        });
        console.log('Change package secret successfully!');
    }
}

ChangeSecretCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});

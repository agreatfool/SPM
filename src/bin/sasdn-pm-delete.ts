import * as program from 'commander';
import {HttpRequest} from './lib/lib';

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

const PKG_NAME: string = program.args[0];
const SECRET: string = program.args[1];

export class DeleteCLI {

    static instance() {
        return new DeleteCLI();
    }

    public async run() {
        console.log('DeleteCLI start.');
        this._validateParams();
        await this._deletePackage();
    }

    private _validateParams(): void {
        if (!PKG_NAME) {
            throw new Error('Please input package name!');
        }
        if (!SECRET) {
            throw new Error('Please input secret!');
        }
    }

    /**
     * 逻辑删除中心节点的包
     * @returns {Promise<void>}
     * @private
     */
    private async _deletePackage(): Promise<void> {
        await HttpRequest.post('/v1/delete_package', {packageName: PKG_NAME, secret: SECRET});
        console.log('Delete package successfully!');
    }
}

DeleteCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});

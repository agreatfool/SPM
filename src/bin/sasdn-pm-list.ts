import * as program from 'commander';
import {HttpRequest} from './lib/lib';
import {SpmPackage} from '../lib/entity/SpmPackage';

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

export class ListCLI {

    static instance() {
        return new ListCLI();
    }

    public async run() {
        console.log('ListCLI start.');
        await this._displaySearchResult();
    }

    /**
     * 访问 /v1/search，并显示搜索结果。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _displaySearchResult() {
        console.log('ListCLI search.');

        let params = {
            keyword: 'all',
        };

        try {
            let response = await HttpRequest.post('/v1/search', params) as Array<SpmPackage>;

            console.log('--------------Remote Packages---------------');
            if (response.length > 0) {
                this._showPackageInfo(response);
            } else {
                console.log('package not found!');
            }
            console.log('--------------Remote Packages---------------');

        } catch (e) {
            throw e;
        }
    }

    /**
     * 在终端显示 proto 包
     * @param {Array<SpmPackage>} packageInfoList
     * @private
     */
    private _showPackageInfo(packageInfoList: Array<SpmPackage>): void {
        for (let packageInfo of packageInfoList) {
            console.log(`├── ${packageInfo.name} | ${(packageInfo.description) ? packageInfo.description : 'no description'}`);
        }
    }
}

ListCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});

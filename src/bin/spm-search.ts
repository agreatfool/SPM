import * as program from "commander";
import {SpmPackageRequest} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:search');

program.version(pkg.version)
    .option('-k, --keyword <item>', 'keyword')
    .parse(process.argv);

const KEYWORD_VALUE = (program as any).keyword === undefined ? undefined : (program as any).keyword;

class SearchCLI {

    static instance() {
        return new SearchCLI();
    }

    public async run() {
        debug('SearchCLI start.');
        await this._validate();
        await this._search();
    }

    private async _validate() {
        debug('SearchCLI validate.');

        if (!KEYWORD_VALUE) {
            throw new Error('--keyword is required');
        }
    }

    private async _search() {
        debug('SearchCLI search.');

        await new Promise(async (resolve, reject) => {
            let params = {
                keyword: KEYWORD_VALUE,
            };

            SpmPackageRequest.postRequest('/v1/search', params, (chunk) => {

                try {
                    let response = SpmPackageRequest.parseResponse(chunk) as Array<string>;
                    console.log('--------------Search Response---------------');
                    if (response.length > 0) {
                        for (let value of response) {
                            console.log(value);
                        }
                    } else {
                        console.log('package not found!');
                    }
                    console.log('--------------Search Response---------------');
                    resolve();
                } catch (e) {
                    reject(e);
                }

            });
        });

    }
}

SearchCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
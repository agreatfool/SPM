import * as program from 'commander';
import * as _ from 'underscore';
import * as request from './lib/request';
import {SpmPackageRequest} from './lib/lib';
import {SpmPackage} from '../lib/entity/SpmPackage';
import {SpmPackageVersion} from '../lib/entity/SpmPackageVersion';

const pkg = require('../../package.json');

program.version(pkg.version)
    .option('-i, --info', 'show proto info')
    .parse(process.argv);

const INFO_VALUE = (program as any).info === undefined ? undefined : (program as any).info;
const KEYWORD_VALUE = program.args[0] === undefined ? undefined : program.args[0];

export class SearchCLI {

    static instance() {
        return new SearchCLI();
    }

    public async run() {
        console.log('SearchCLI start.');
        await this._validate();
        await this._search();
    }

    private async _validate() {
        console.log('SearchCLI validate.');

        if (!KEYWORD_VALUE) {
            throw new Error('keyword is required');
        }
    }

    private async _search() {
        console.log('SearchCLI search.');

        await new Promise(async (resolve, reject) => {
            let params = {
                keyword: KEYWORD_VALUE,
                info: !!(INFO_VALUE)
            };

            request.post('/v1/search', params, (chunk, reqResolve, reqReject) => {
                try {
                    reqResolve(SpmPackageRequest.parseResponse(chunk));
                } catch (e) {
                    reqReject(e);
                }
            }).then((response: Array<SpmPackage | [SpmPackage, SpmPackageVersion]>) => {
                console.log('--------------Search Response---------------');
                if (response.length > 0) {
                    for (let packageInfo of response) {
                        if (_.isArray(packageInfo)) {
                            let [spmPackage, spmPackageVersion] = packageInfo as [SpmPackage, SpmPackageVersion];
                            console.log(`${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                        } else {
                            console.log(`${packageInfo.name} | ${(packageInfo.description) ? packageInfo.description : 'no description'}`);
                        }
                    }
                } else {
                    console.log('package not found!');
                }
                console.log('--------------Search Response---------------');
                resolve();
            }).catch((e) => {
                reject(e);
            });
        });

    }
}

SearchCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});
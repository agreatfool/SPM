import * as program from "commander";
import * as LibPath from "path";
import * as LibFs from "mz/fs";
import {RequestMethod, SpmHttp} from "./lib/lib";
import * as http from "http";
import * as qs from "querystring";
import * as _ from "underscore";
import {ResponseSchema} from "../lib/Router";

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

        // 创建临时文件夹
        await new Promise(async (resolve, reject) => {
            let reqParamsStr = qs.stringify({
                keyword: KEYWORD_VALUE,
            });

            // create request
            let reqOptions = await SpmHttp.getRequestOption('/v1/search', RequestMethod.post);
            let req = http.request(reqOptions, (res) => {
                res.on("data", (chunk) => {
                    let response = JSON.parse(chunk.toString()) as ResponseSchema;
                    let pkgNames = response.msg as Array<string>;
                    if (_.isArray(pkgNames)) {
                        console.log('--------------Search Response---------------');
                        if (pkgNames.length > 0) {
                            for (let pkgName of pkgNames) {
                                console.log(pkgName);
                            }
                        } else {
                            console.log('package not found!');
                        }
                        console.log('--------------Search Response---------------');
                        resolve();
                    } else {
                        reject(new Error(chunk.toString()));
                    }
                });
            }).on('error', (e) => reject(e));

            // send request headers
            req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
            req.write(reqParamsStr);
        });

    }
}

SearchCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
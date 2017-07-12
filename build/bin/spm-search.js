"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const lib_1 = require("./lib/lib");
const http = require("http");
const qs = require("querystring");
const _ = require("underscore");
const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:search');
program.version(pkg.version)
    .option('-k, --keyword <item>', 'keyword')
    .parse(process.argv);
const KEYWORD_VALUE = program.keyword === undefined ? undefined : program.keyword;
class SearchCLI {
    static instance() {
        return new SearchCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('SearchCLI start.');
            yield this._validate();
            yield this._search();
        });
    }
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('SearchCLI validate.');
            if (!KEYWORD_VALUE) {
                throw new Error('--keyword is required');
            }
        });
    }
    _search() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('SearchCLI search.');
            // 创建临时文件夹
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let reqParamsStr = qs.stringify({
                    keyword: KEYWORD_VALUE,
                });
                // create request
                let reqOptions = yield lib_1.SpmHttp.getRequestOption('/v1/search', lib_1.RequestMethod.post);
                let req = http.request(reqOptions, (res) => {
                    res.on("data", (chunk) => {
                        let response = JSON.parse(chunk.toString());
                        let pkgNames = response.msg;
                        if (_.isArray(pkgNames)) {
                            console.log('--------------Search Response---------------');
                            if (pkgNames.length > 0) {
                                for (let pkgName of pkgNames) {
                                    console.log(pkgName);
                                }
                            }
                            else {
                                console.log('package not found!');
                            }
                            console.log('--------------Search Response---------------');
                            resolve();
                        }
                        else {
                            reject(new Error(chunk.toString()));
                        }
                    });
                }).on('error', (e) => reject(e));
                // send request headers
                req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
                req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
                req.write(reqParamsStr);
            }));
        });
    }
}
SearchCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=spm-search.js.map
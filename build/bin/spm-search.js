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
const _ = require("underscore");
const lib_1 = require("./lib/lib");
const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:search');
program.version(pkg.version)
    .option('-i, --info', 'show proto info')
    .parse(process.argv);
const INFO_VALUE = program.info === undefined ? undefined : program.info;
const KEYWORD_VALUE = program.args[0] === undefined ? undefined : program.args[0];
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
                throw new Error('keyword is required');
            }
        });
    }
    _search() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('SearchCLI search.');
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let params = {
                    keyword: KEYWORD_VALUE,
                    info: !!(INFO_VALUE)
                };
                lib_1.SpmPackageRequest.postRequest('/v1/search', params, (chunk, reqResolve) => {
                    reqResolve(lib_1.SpmPackageRequest.parseResponse(chunk));
                }).then((response) => {
                    console.log('--------------Search Response---------------');
                    if (response.length > 0) {
                        for (let packageInfo of response) {
                            if (_.isArray(packageInfo)) {
                                let [spmPackage, spmPackageVersion] = packageInfo;
                                console.log(`${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                            }
                            else {
                                console.log(`${packageInfo.name} | ${packageInfo.description}`);
                            }
                        }
                    }
                    else {
                        console.log('package not found!');
                    }
                    console.log('--------------Search Response---------------');
                    resolve();
                }).catch((e) => {
                    reject(e);
                });
            }));
        });
    }
}
SearchCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=spm-search.js.map
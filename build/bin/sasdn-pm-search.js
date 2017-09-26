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
            console.log('SearchCLI start.');
            yield this._validate();
            yield this._displaySearchResult();
        });
    }
    /**
     * 验证参数，数据，环境是否正确
     *
     * @returns {Promise<void>}
     * @private
     */
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('SearchCLI validate.');
            if (!KEYWORD_VALUE) {
                throw new Error('keyword is required');
            }
        });
    }
    /**
     * 访问 /v1/search，并显示搜索结果。
     *
     * @returns {Promise<void>}
     * @private
     */
    _displaySearchResult() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('SearchCLI search.');
            let params = {
                keyword: KEYWORD_VALUE,
                info: !!(INFO_VALUE)
            };
            try {
                let response = yield lib_1.httpRequest.post('/v1/search', params);
                console.log('--------------Search Response---------------');
                if (response.length > 0) {
                    for (let packageInfo of response) {
                        if (_.isArray(packageInfo)) {
                            let [spmPackage, spmPackageVersion] = packageInfo;
                            console.log(`${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                        }
                        else {
                            console.log(`${packageInfo.name} | ${(packageInfo.description) ? packageInfo.description : 'no description'}`);
                        }
                    }
                }
                else {
                    console.log('package not found!');
                }
                console.log('--------------Search Response---------------');
            }
            catch (e) {
                throw e;
            }
        });
    }
}
exports.SearchCLI = SearchCLI;
SearchCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});
//# sourceMappingURL=sasdn-pm-search.js.map
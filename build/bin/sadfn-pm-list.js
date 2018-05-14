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
const pkg = require('../../package.json');
program.version(pkg.version)
    .parse(process.argv);
class ListCLI {
    static instance() {
        return new ListCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('SearchCLI start.');
            yield this._displaySearchResult();
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
                keyword: 'all',
            };
            try {
                let response = yield lib_1.HttpRequest.post('/v1/search', params);
                console.log('--------------Search Response---------------');
                if (response.length > 0) {
                    this._showPackageInfo(response);
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
    /**
     * 在终端显示 proto 包
     * @param {Array<SpmPackage | [SpmPackage , SpmPackageVersion]>} packageInfoList
     * @private
     */
    _showPackageInfo(packageInfoList) {
        for (let packageInfo of packageInfoList) {
            console.log(`├── ${packageInfo.name} | ${(packageInfo.description) ? packageInfo.description : 'no description'}`);
        }
    }
}
exports.ListCLI = ListCLI;
ListCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});

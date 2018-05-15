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
    .description('search proto from spm server')
    .usage('[Options] <<package>[@version]>')
    .option('-i, --info', 'add -i to show proto version info of specific proto package')
    .option('-d, --dependence', 'add -d to show dependences of specific version proto, default is latest')
    .parse(process.argv);
const INFO_VALUE = program.info === undefined ? undefined : program.info;
const KEYWORD_VALUE = program.args[0] === undefined ? undefined : program.args[0];
const SHOW_DEPENDENCE_FLAG = program.dependence;
class ListCLI {
    static instance() {
        return new ListCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('ListCLI start.');
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
            if (!KEYWORD_VALUE) {
                throw new Error('Package name is required.');
            }
            let params = {
                keyword: KEYWORD_VALUE && KEYWORD_VALUE.split('@')[0],
                info: !!(INFO_VALUE),
            };
            try {
                let response = yield lib_1.HttpRequest.post('/v1/search', params);
                console.log('--------------Search Response---------------');
                if (response.length > 0) {
                    let version = KEYWORD_VALUE && KEYWORD_VALUE.split('@')[1];
                    if (!version || !INFO_VALUE) {
                        this._showPackageInfo(response);
                    }
                    else {
                        let packageList = this._filterPackageList(response);
                        this._showPackageInfo(packageList);
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
    /**
     * 过滤 package，找到最新版本的 package 或特定版本的 package
     * @param {Array<[SpmPackage , SpmPackageVersion]>} packageInfoList
     * @returns {Array<[SpmPackage , SpmPackageVersion]>}
     * @private
     */
    _filterPackageList(packageInfoList) {
        let version = KEYWORD_VALUE.split('@')[1];
        if (version === 'latest') {
            let latestPackage = packageInfoList[0];
            for (let packageInfo of packageInfoList) {
                latestPackage = this._findLaterPackage(latestPackage, packageInfo);
            }
            return [latestPackage];
        }
        else if (/^\d+\.\d+\.\d+$/.test(version)) {
            let versionList = version.split('.');
            return packageInfoList.filter((item) => {
                let major = item[1].major;
                let minor = item[1].minor;
                let patch = item[1].patch;
                return parseInt(versionList[0]) === major && parseInt(versionList[1]) === minor && parseInt(versionList[2]) === patch;
            });
        }
        else {
            throw new Error('version format is not legal');
        }
    }
    /**
     * 找到两个 package 中更新的版本
     * @param {[SpmPackage , SpmPackageVersion]} package1
     * @param {[SpmPackage , SpmPackageVersion]} package2
     * @returns {[SpmPackage , SpmPackageVersion]}
     * @private
     */
    _findLaterPackage(package1, package2) {
        let packageVersion1 = package1[1];
        let packageVersion2 = package2[1];
        let compareKeyList = ['major', 'minor', 'patch'];
        for (let compareKey of compareKeyList) {
            if (packageVersion1[compareKey] > packageVersion2[compareKey]) {
                return package1;
            }
            else if (packageVersion1[compareKey] < packageVersion2[compareKey]) {
                return package2;
            }
        }
        return package1;
    }
    /**
     * 在终端显示 proto 包
     * @param {Array<SpmPackage | [SpmPackage , SpmPackageVersion]>} packageInfoList
     * @private
     */
    _showPackageInfo(packageInfoList) {
        for (let packageInfo of packageInfoList) {
            if (_.isArray(packageInfo)) {
                let [spmPackage, spmPackageVersion] = packageInfo;
                let dependenceMap = JSON.parse(spmPackageVersion.dependencies);
                let depLength = Object.keys(dependenceMap).length;
                if (depLength !== 0 && SHOW_DEPENDENCE_FLAG) {
                    console.log(`├─┬ ${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                }
                else {
                    console.log(`├── ${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                }
                if (SHOW_DEPENDENCE_FLAG) {
                    this._showDependence(spmPackageVersion);
                }
            }
            else {
                console.log(`├── ${packageInfo.name} | ${(packageInfo.description) ? packageInfo.description : 'no description'}`);
            }
        }
    }
    /**
     * 在终端显示依赖的 proto 包以及版本
     * @param {SpmPackageVersion} spmPackageVersion
     * @private
     */
    _showDependence(spmPackageVersion) {
        let dependenceMap = JSON.parse(spmPackageVersion.dependencies);
        let depLength = Object.keys(dependenceMap).length;
        let count = 0;
        for (let dependName in dependenceMap) {
            count += 1;
            if (count !== depLength) {
                console.log(`│ ├── ${dependName}@${dependenceMap[dependName]}`);
            }
            else {
                console.log(`│ └── ${dependName}@${dependenceMap[dependName]}`);
            }
        }
    }
}
exports.ListCLI = ListCLI;
ListCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});

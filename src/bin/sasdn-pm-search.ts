import * as program from 'commander';
import * as _ from 'underscore';
import {HttpRequest} from './lib/lib';
import {SpmPackage} from '../lib/entity/SpmPackage';
import {SpmPackageVersion} from '../lib/entity/SpmPackageVersion';

const pkg = require('../../package.json');

program.version(pkg.version)
    .option('-i, --info', 'show proto version info of specific proto package')
    .option('-d, --dependence', 'show dependences of specific version proto, default is latest')
    .parse(process.argv);

const INFO_VALUE = (program as any).info === undefined ? undefined : (program as any).info;
const KEYWORD_VALUE = program.args[0] === undefined ? undefined : program.args[0];
const SHOW_DEPENDENCE_FLAG = program.dependence;

export class SearchCLI {

    static instance() {
        return new SearchCLI();
    }

    public async run() {
        console.log('SearchCLI start.');
        await this._displaySearchResult();
    }

    /**
     * 访问 /v1/search，并显示搜索结果。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _displaySearchResult() {
        console.log('SearchCLI search.');

        let params = {
            keyword: KEYWORD_VALUE && KEYWORD_VALUE.split('@')[0] || 'all',
            info: !!(INFO_VALUE),
        };

        try {
            let response = await HttpRequest.post('/v1/search', params) as Array<SpmPackage | [SpmPackage, SpmPackageVersion]>;

            console.log('--------------Search Response---------------');
            if (response.length > 0) {
                let version = KEYWORD_VALUE && KEYWORD_VALUE.split('@')[1];
                if (!version || !INFO_VALUE) {
                    this._showPackageInfo(response);
                } else {
                    let packageList: Array<[SpmPackage, SpmPackageVersion]> = this._filterPackageList(response as Array<[SpmPackage, SpmPackageVersion]>);
                    this._showPackageInfo(packageList);
                }
            } else {
                console.log('package not found!');
            }
            console.log('--------------Search Response---------------');

        } catch (e) {
            throw e;
        }
    }

    /**
     * 过滤 package，找到最新版本的 package 或特定版本的 package
     * @param {Array<[SpmPackage , SpmPackageVersion]>} packageInfoList
     * @returns {Array<[SpmPackage , SpmPackageVersion]>}
     * @private
     */
    private _filterPackageList(packageInfoList: Array<[SpmPackage, SpmPackageVersion]>): Array<[SpmPackage, SpmPackageVersion]> {
        let version = KEYWORD_VALUE.split('@')[1];
        if (version === 'latest') {
            let latestPackage = packageInfoList[0];
            for (let packageInfo of packageInfoList) {
                latestPackage = this._findLaterPackage(latestPackage, packageInfo);
            }
            return [latestPackage];
        } else if (/^\d+\.\d+\.\d+$/.test(version)) {
            let versionList = version.split('.');
            return packageInfoList.filter((item) => {
                let major = item[1].major;
                let minor = item[1].minor;
                let patch = item[1].patch;
                return parseInt(versionList[0]) === major && parseInt(versionList[1]) === minor && parseInt(versionList[2]) === patch;
            });
        } else {
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
    private _findLaterPackage(package1: [SpmPackage, SpmPackageVersion], package2: [SpmPackage, SpmPackageVersion]): [SpmPackage, SpmPackageVersion] {
        let packageVersion1 = package1[1];
        let packageVersion2 = package2[1];
        let compareKeyList = ['major', 'minor', 'patch'];
        for (let compareKey of compareKeyList) {
            if (packageVersion1[compareKey] > packageVersion2[compareKey]) {
                return package1;
            } else if (packageVersion1[compareKey] < packageVersion2[compareKey]) {
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
    private _showPackageInfo(packageInfoList: Array<SpmPackage | [SpmPackage, SpmPackageVersion]>): void {
        for (let packageInfo of packageInfoList) {
            if (_.isArray(packageInfo)) {
                let [spmPackage, spmPackageVersion] = packageInfo as [SpmPackage, SpmPackageVersion];
                let dependenceMap: { [key: string]: string; } = JSON.parse(spmPackageVersion.dependencies);
                let depLength = Object.keys(dependenceMap).length;
                if (depLength !== 0 && SHOW_DEPENDENCE_FLAG) {
                    console.log(`├─┬ ${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                } else {
                    console.log(`├── ${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                }
                if (SHOW_DEPENDENCE_FLAG) {
                    this._showDependence(spmPackageVersion);
                }
            } else {
                console.log(`├── ${packageInfo.name} | ${(packageInfo.description) ? packageInfo.description : 'no description'}`);
            }
        }
    }

    /**
     * 在终端显示依赖的 proto 包以及版本
     * @param {SpmPackageVersion} spmPackageVersion
     * @private
     */
    private _showDependence(spmPackageVersion: SpmPackageVersion): void {
        let dependenceMap: { [key: string]: string; } = JSON.parse(spmPackageVersion.dependencies);
        let depLength = Object.keys(dependenceMap).length;
        let count = 0;
        for (let dependName in dependenceMap) {
            count += 1;
            if (count !== depLength) {
                console.log(`│ ├── ${dependName}@${dependenceMap[dependName]}`);
            } else {
                console.log(`│ └── ${dependName}@${dependenceMap[dependName]}`);
            }
        }
    }
}

SearchCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});

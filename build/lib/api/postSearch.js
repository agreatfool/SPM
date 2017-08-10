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
require("reflect-metadata");
const _ = require("underscore");
const Database_1 = require("../Database");
const SpmPackage_1 = require("../entity/SpmPackage");
const SpmPackageVersion_1 = require("../entity/SpmPackageVersion");
const ApiBase_1 = require("../ApiBase");
class PostSearch extends ApiBase_1.ApiBase {
    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/search';
        this.type = 'application/json; charset=utf-8';
    }
    paramsValidate(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = ctx.request.body;
            if (!params.keyword || _.isEmpty(params.keyword)) {
                throw new Error('keyword is required!');
            }
        });
    }
    handle(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const params = ctx.request.body;
                const dbConn = Database_1.default.instance().conn;
                if (params.info == 'true') {
                    return this.buildResponse(yield this.preciseQuery(params.keyword, dbConn));
                }
                else {
                    return this.buildResponse(yield this.fuzzyQuery(params.keyword, dbConn));
                }
            }
            catch (err) {
                return this.buildResponse(err.message, -1);
            }
        });
    }
    ;
    fuzzyQuery(keyword, dbConn) {
        return __awaiter(this, void 0, void 0, function* () {
            let packageInfos = [];
            let spmPackageList = yield dbConn
                .getRepository(SpmPackage_1.SpmPackage)
                .createQueryBuilder('package')
                .where('package.name LIKE :keyword', { keyword: `%${keyword}%` })
                .orWhere('package.description LIKE :keyword', { keyword: `%${keyword}%` })
                .getMany();
            for (let spmPackage of spmPackageList) {
                packageInfos.push(spmPackage);
            }
            return packageInfos;
        });
    }
    preciseQuery(keyword, dbConn) {
        return __awaiter(this, void 0, void 0, function* () {
            let packageInfos = [];
            let spmPackage = yield dbConn
                .getRepository(SpmPackage_1.SpmPackage)
                .createQueryBuilder('package')
                .where('package.name=:keyword', { keyword: `${keyword}` })
                .getOne();
            if (_.isEmpty(spmPackage)) {
                return packageInfos;
            }
            let spmPackageVersionList = yield dbConn
                .getRepository(SpmPackageVersion_1.SpmPackageVersion)
                .createQueryBuilder('version')
                .where('version.pid=:pid', { pid: spmPackage.id })
                .getMany();
            for (let spmPackageVersion of spmPackageVersionList) {
                packageInfos.push([spmPackage, spmPackageVersion]);
            }
            return packageInfos;
        });
    }
}
exports.api = new PostSearch();

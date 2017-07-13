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
                throw new Error("keyword is required!");
            }
        });
    }
    handle(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const params = ctx.request.body;
                let packages = [];
                // find package
                let spmPackageList = yield this.dbHandler
                    .getRepository(SpmPackage_1.SpmPackage)
                    .createQueryBuilder("package")
                    .where('package.name LIKE :keyword', { keyword: `%${params.keyword}%` })
                    .getMany();
                for (let spmPackage of spmPackageList) {
                    let spmPackageVersion = yield this.dbHandler
                        .getRepository(SpmPackageVersion_1.SpmPackageVersion)
                        .createQueryBuilder("version")
                        .where('version.pid=:pid', { pid: spmPackage.id })
                        .orderBy("version.major", "DESC")
                        .addOrderBy("version.minor", "DESC")
                        .addOrderBy("version.patch", "DESC")
                        .getOne();
                    if (!_.isEmpty(spmPackageVersion)) {
                        packages.push(`${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                    }
                }
                return this.buildResponse(packages);
            }
            catch (err) {
                return this.buildResponse(err.message, -1);
            }
        });
    }
    ;
}
exports.api = new PostSearch();
//# sourceMappingURL=postSearch.js.map
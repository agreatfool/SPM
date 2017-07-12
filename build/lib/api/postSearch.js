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
class PostSearch {
    constructor() {
        this.method = 'post';
        this.uri = '/v1/search';
        this.type = 'application/json; charset=utf-8';
    }
    register(options, conn) {
        return [this.uri, this._validate(options, conn), this._execute(options, conn)];
    }
    ;
    _validate(options, conn) {
        let _this = this;
        return function (ctx, next) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    yield _this.paramsValidate(ctx, options);
                    yield next();
                }
                catch (err) {
                    let res = {};
                    res.code = -1;
                    res.msg = err.message;
                    ctx.body = res;
                }
            });
        };
    }
    _execute(options, conn) {
        let _this = this;
        return function (ctx, next) {
            return __awaiter(this, void 0, void 0, function* () {
                ctx.body = yield _this.handle(ctx, next, conn);
                yield next();
            });
        };
    }
    paramsValidate(ctx, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = ctx.request.body;
            if (!params.keyword || _.isEmpty(params.keyword)) {
                throw new Error("keyword is required!");
            }
        });
    }
    handle(ctx, next, conn) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = {};
            try {
                const params = ctx.request.body;
                let pkgNames = [];
                // find package
                let spmPackageList = yield conn
                    .getRepository(SpmPackage_1.SpmPackage)
                    .createQueryBuilder("package")
                    .where('package.name LIKE :keyword', { keyword: `%${params.keyword}%` })
                    .getMany();
                for (let spmPackage of spmPackageList) {
                    let spmPackageVersion = yield conn
                        .getRepository(SpmPackageVersion_1.SpmPackageVersion)
                        .createQueryBuilder("version")
                        .where('version.pid=:pid', { pid: spmPackage.id })
                        .orderBy("version.major", "DESC")
                        .addOrderBy("version.minor", "DESC")
                        .addOrderBy("version.patch", "DESC")
                        .getOne();
                    if (!_.isEmpty(spmPackageVersion)) {
                        pkgNames.push(`${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                    }
                }
                res.code = 0;
                res.msg = pkgNames;
                return res;
            }
            catch (err) {
                res.code = -1;
                res.msg = err.message;
            }
            return res;
        });
    }
    ;
}
exports.api = new PostSearch();
//# sourceMappingURL=postSearch.js.map
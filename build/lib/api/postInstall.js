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
const LibFs = require("mz/fs");
const _ = require("underscore");
const SpmPackage_1 = require("../entity/SpmPackage");
const SpmPackageVersion_1 = require("../entity/SpmPackageVersion");
class PostInstall {
    constructor() {
        this.method = 'post';
        this.uri = '/v1/install';
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
                let body = yield _this.handle(ctx, next, conn);
                if (!_.isEmpty(body)) {
                    ctx.body = body;
                }
                yield next();
            });
        };
    }
    paramsValidate(ctx, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = ctx.request.body;
            if (!params.name || _.isEmpty(params.name)) {
                throw new Error("Name is required!");
            }
        });
    }
    handle(ctx, next, conn) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = {};
            try {
                const params = ctx.request.body;
                let [name, version] = params.name.split('@');
                // find package
                let spmPackage = yield conn
                    .getRepository(SpmPackage_1.SpmPackage)
                    .createQueryBuilder("package")
                    .where('package.name=:name', { name: name })
                    .getOne();
                if (_.isEmpty(spmPackage)) {
                    res.code = -1;
                    res.msg = "Package not found, name: " + name;
                    return res;
                }
                let spmPackageVersion;
                if (!_.isEmpty(version)) {
                    const [major, minor, patch] = version.split('.');
                    // find package version
                    spmPackageVersion = yield conn
                        .getRepository(SpmPackageVersion_1.SpmPackageVersion)
                        .createQueryBuilder("version")
                        .where('version.pid=:pid', { pid: spmPackage.id })
                        .andWhere('version.major=:major', { major: major })
                        .andWhere('version.minor=:minor', { minor: minor })
                        .andWhere('version.patch=:patch', { patch: patch })
                        .getOne();
                }
                else {
                    // find package version
                    spmPackageVersion = yield conn
                        .getRepository(SpmPackageVersion_1.SpmPackageVersion)
                        .createQueryBuilder("version")
                        .where('version.pid=:pid', { pid: spmPackage.id })
                        .orderBy("version.major", "DESC")
                        .addOrderBy("version.minor", "DESC")
                        .addOrderBy("version.patch", "DESC")
                        .getOne();
                }
                if (_.isEmpty(spmPackageVersion)) {
                    res.code = -1;
                    res.msg = "Package version not found, name: " + name;
                    return res;
                }
                let fileStat = yield LibFs.stat(spmPackageVersion.filePath);
                if (fileStat.isFile()) {
                    ctx.body = LibFs.createReadStream(spmPackageVersion.filePath);
                    ctx.set('Content-Disposition', `attachment; filename=${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                    return;
                }
                else {
                    res.code = -1;
                    res.msg = "Package file not found, path: " + spmPackageVersion.filePath;
                }
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
exports.api = new PostInstall();
//# sourceMappingURL=postInstall.js.map
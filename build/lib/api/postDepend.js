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
class PostDepend {
    constructor() {
        this.method = 'post';
        this.uri = '/v1/depend';
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
            if (!params.name || _.isEmpty(params.name)) {
                throw new Error("Name is required!");
            }
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
                const [name, version] = params.name.split('@');
                res.code = 0;
                res.msg = yield this.findDependencies(name, version, conn, {});
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
    findDependencies(name, version, conn, dependencies) {
        return __awaiter(this, void 0, void 0, function* () {
            // if dependencies is exist, return ..
            if (dependencies.hasOwnProperty(`${name}@${version}`)) {
                return dependencies;
            }
            if (!_.isEmpty(version)) {
                const [major, minor, patch] = version.split('.');
            }
            // find package
            let spmPackage = yield conn
                .getRepository(SpmPackage_1.SpmPackage)
                .createQueryBuilder("package")
                .where('package.name=:name', { name: name })
                .getOne();
            if (_.isEmpty(spmPackage)) {
                throw new Error("Package not found, name: " + name);
            }
            let spmPackageVersion;
            if (!_.isEmpty(version)) {
                const [major, minor, patch] = version.split('.');
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
                throw new Error("Package version not found, name: " + name + ", version: " + spmPackageVersion.major + '.' + spmPackageVersion.minor + '.' + spmPackageVersion.patch);
            }
            let pkgDependencies = {};
            try {
                pkgDependencies = JSON.parse(spmPackageVersion.dependencies);
            }
            catch (e) {
                //do nothing
            }
            dependencies[`${name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`] = {
                path: spmPackageVersion.filePath,
                dependencies: pkgDependencies
            };
            for (let pkgName in pkgDependencies) {
                dependencies = yield this.findDependencies(pkgName, pkgDependencies[pkgName], conn, dependencies);
            }
            return dependencies;
        });
    }
}
exports.api = new PostDepend();
//# sourceMappingURL=postDepend.js.map
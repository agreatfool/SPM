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
class PostDepend extends ApiBase_1.ApiBase {
    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/depend';
        this.type = 'application/json; charset=utf-8';
    }
    paramsValidate(ctx) {
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
    handle(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const params = ctx.request.body;
                const [name, version] = params.name.split('@');
                return this.buildResponse(yield this.findDependencies(name, version, {}));
            }
            catch (err) {
                return this.buildResponse(err.message, -1);
            }
        });
    }
    ;
    findDependencies(name, version, dependencies) {
        return __awaiter(this, void 0, void 0, function* () {
            // if dependencies is exist, return ..
            if (dependencies.hasOwnProperty(`${name}@${version}`)) {
                return dependencies;
            }
            // find package
            let spmPackage = yield this.dbHandler
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
                spmPackageVersion = yield this.dbHandler
                    .getRepository(SpmPackageVersion_1.SpmPackageVersion)
                    .createQueryBuilder("version")
                    .where('version.pid=:pid', { pid: spmPackage.id })
                    .andWhere('version.major=:major', { major: major })
                    .andWhere('version.minor=:minor', { minor: minor })
                    .andWhere('version.patch=:patch', { patch: patch })
                    .getOne();
            }
            else {
                spmPackageVersion = yield this.dbHandler
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
            // deep loop
            for (let dependPackageName in pkgDependencies) {
                dependencies = yield this.findDependencies(dependPackageName, pkgDependencies[dependPackageName], dependencies);
            }
            return dependencies;
        });
    }
}
exports.api = new PostDepend();
//# sourceMappingURL=postDepend.js.map
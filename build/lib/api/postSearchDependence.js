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
class PostSearchDependence extends ApiBase_1.ApiBase {
    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/search_dependencies';
        this.type = 'application/json; charset=utf-8';
    }
    paramsValidate(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = ctx.request.body;
            if (!params.name || _.isEmpty(params.name)) {
                throw new Error('Name is required!');
            }
        });
    }
    handle(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dbConn = Database_1.default.instance().conn;
                const params = ctx.request.body;
                const [name, version] = params.name.split('@');
                return this.buildResponse(yield this.findDependencies(dbConn, name, version, {}));
            }
            catch (err) {
                return this.buildResponse(err.message, -1);
            }
        });
    }
    ;
    findDependencies(dbConn, name, version, dependencies, isDependencies = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // if dependencies is exist, return ..
            if (dependencies.hasOwnProperty(`${name}@${version}`)) {
                return dependencies;
            }
            // find package
            let spmPackage = yield dbConn
                .getRepository(SpmPackage_1.SpmPackage)
                .createQueryBuilder('package')
                .where('package.name=:name', { name: name })
                .getOne();
            if (_.isEmpty(spmPackage)) {
                throw new Error('Package not found, name: ' + name);
            }
            // build spm package version query
            let sheetName = 'version';
            let spmPackageVersion;
            let columnNameWhereQuery = [`${sheetName}.name=:name`, { name: spmPackage.name }];
            if (!_.isEmpty(version)) {
                const [major, minor, patch] = version.split('.');
                spmPackageVersion = yield dbConn
                    .getRepository(SpmPackageVersion_1.SpmPackageVersion)
                    .createQueryBuilder(sheetName)
                    .where(columnNameWhereQuery[0], columnNameWhereQuery[1])
                    .andWhere(`${sheetName}.major=:major`, { major: major })
                    .andWhere(`${sheetName}.minor=:minor`, { minor: minor })
                    .andWhere(`${sheetName}.patch=:patch`, { patch: patch })
                    .getOne();
            }
            else {
                spmPackageVersion = yield dbConn
                    .getRepository(SpmPackageVersion_1.SpmPackageVersion)
                    .createQueryBuilder(sheetName)
                    .where(columnNameWhereQuery[0], columnNameWhereQuery[1])
                    .orderBy(`${sheetName}.major`, 'DESC')
                    .addOrderBy(`${sheetName}.minor`, 'DESC')
                    .addOrderBy(`${sheetName}.patch`, 'DESC')
                    .getOne();
            }
            if (_.isEmpty(spmPackageVersion)) {
                throw new Error('Package version not found, name: ' + spmPackage.name + ', version: ' + version);
            }
            let pkgDependencies = {};
            try {
                pkgDependencies = JSON.parse(spmPackageVersion.dependencies);
            }
            catch (e) {
                //do nothing
            }
            dependencies[`${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`] = {
                name: spmPackage.name,
                version: `${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`,
                dependencies: pkgDependencies,
                downloadUrl: spmPackageVersion.filePath,
                isDependencies: isDependencies
            };
            // deep loop
            for (let dependPackageName in pkgDependencies) {
                dependencies = yield this.findDependencies(dbConn, dependPackageName, pkgDependencies[dependPackageName], dependencies, true);
            }
            return dependencies;
        });
    }
}
exports.api = new PostSearchDependence();
//# sourceMappingURL=postSearchDependence.js.map
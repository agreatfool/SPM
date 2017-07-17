import "reflect-metadata";
import * as _ from "underscore";
import {Context as KoaContext} from "koa";
import {MiddlewareNext, ResponseSchema} from "../Router";
import {SpmPackage} from "../entity/SpmPackage";
import {SpmPackageVersion} from "../entity/SpmPackageVersion";
import {SpmPackageMap} from "../../bin/lib/lib";
import {ApiBase} from "../ApiBase";

class PostDepend extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/depend';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const params = ctx.request.body;
        if (!params.name || _.isEmpty(params.name)) {
            throw new Error("Name is required!");
        }

        if (!params.name || _.isEmpty(params.name)) {
            throw new Error("Name is required!");
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        try {
            const params = ctx.request.body;
            const [name, version] = params.name.split('@');
            return this.buildResponse(await this.findDependencies(name, version, {}));
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };

    public async findDependencies(name: string, version: string, dependencies: SpmPackageMap, isDependencies: boolean = false) {

        // if dependencies is exist, return ..
        if (dependencies.hasOwnProperty(`${name}@${version}`)) {
            return dependencies;
        }

        // find package
        let spmPackage = await this.dbHandler
            .getRepository(SpmPackage)
            .createQueryBuilder("package")
            .where('package.name=:name', {name: name})
            .getOne();

        if (_.isEmpty(spmPackage)) {
            throw new Error("Package not found, name: " + name);
        }

        let spmPackageVersion: SpmPackageVersion;
        if (!_.isEmpty(version)) {
            const [major, minor, patch] = version.split('.');
            spmPackageVersion = await this.dbHandler
                .getRepository(SpmPackageVersion)
                .createQueryBuilder("version")
                .where('version.pid=:pid', {pid: spmPackage.id})
                .andWhere('version.major=:major', {major: major})
                .andWhere('version.minor=:minor', {minor: minor})
                .andWhere('version.patch=:patch', {patch: patch})
                .getOne();
        } else {
            spmPackageVersion = await this.dbHandler
                .getRepository(SpmPackageVersion)
                .createQueryBuilder("version")
                .where('version.pid=:pid', {pid: spmPackage.id})
                .orderBy("version.major", "DESC")
                .addOrderBy("version.minor", "DESC")
                .addOrderBy("version.patch", "DESC")
                .getOne();
        }

        if (_.isEmpty(spmPackageVersion)) {
            throw new Error("Package version not found, name: " + spmPackage.name + ", version: " + spmPackageVersion.major + '.' + spmPackageVersion.minor + '.' + spmPackageVersion.patch);
        }

        let pkgDependencies = {};
        try {
            pkgDependencies = JSON.parse(spmPackageVersion.dependencies);
        } catch (e) {
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
            dependencies = await this.findDependencies(dependPackageName, pkgDependencies[dependPackageName], dependencies, true);
        }

        return dependencies;
    }
}

export const api = new PostDepend();
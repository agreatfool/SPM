import "reflect-metadata";
import * as _ from "underscore";
import Database from "../Database";
import {Context as KoaContext} from "koa";
import {SpmPackage} from "../entity/SpmPackage";
import {SpmPackageVersion} from "../entity/SpmPackageVersion";
import {SpmPackageMap} from "../../bin/lib/lib";
import {ApiBase, MiddlewareNext, ResponseSchema} from "../ApiBase";
import {Connection} from "typeorm";

type SheetColumnWhereSchema = [string, any];

interface SearchDependenceParams {
    name: string;
}

class PostSearchDependence extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/search_dependencies';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const params = (ctx.request as any).body as SearchDependenceParams;
        if (!params.name || _.isEmpty(params.name)) {
            throw new Error('Name is required!');
        }

        if (!params.name || _.isEmpty(params.name)) {
            throw new Error('Name is required!');
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        try {
            const dbConn = Database.instance().conn;
            const params = (ctx.request as any).body as SearchDependenceParams;
            const [name, version] = params.name.split('@');
            return this.buildResponse(await this.findDependencies(dbConn, name, version, {}));
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };

    public async findDependencies(dbConn: Connection, name: string, version: string, dependencies: SpmPackageMap, isDependencies: boolean = false): Promise<SpmPackageMap> {

        // if dependencies is exist, return ..
        if (dependencies.hasOwnProperty(`${name}@${version}`)) {
            return dependencies;
        }

        // find package
        let spmPackage = await dbConn
            .getRepository(SpmPackage)
            .createQueryBuilder('package')
            .where('package.name=:name', {name: name})
            .getOne();

        if (_.isEmpty(spmPackage)) {
            throw new Error('Package not found, name: ' + name);
        }

        // build spm package version query
        let sheetName = 'version';
        let columnPidWhereQuery = [`${sheetName}.pid=:pid`, {pid: spmPackage.id}] as SheetColumnWhereSchema;
        let columnMajorWhereQuery = [`${sheetName}.major`, 'DESC'] as SheetColumnWhereSchema;
        let columnMinorWhereQuery = [`${sheetName}.minor`, 'DESC'] as SheetColumnWhereSchema;
        let columnPatchWhereQuery = [`${sheetName}.patch`, 'DESC'] as SheetColumnWhereSchema;
        if (!_.isEmpty(version)) {
            const [major, minor, patch] = version.split('.');
            columnMajorWhereQuery = [`${sheetName}.major=:major`, {major: major}] as SheetColumnWhereSchema;
            columnMinorWhereQuery = [`${sheetName}.minor=:minor`, {minor: minor}] as SheetColumnWhereSchema;
            columnPatchWhereQuery = [`${sheetName}.patch=:patch`, {patch: patch}] as SheetColumnWhereSchema;
        }

        let spmPackageVersion = await dbConn
            .getRepository(SpmPackageVersion)
            .createQueryBuilder(sheetName)
            .where(columnPidWhereQuery[0], columnPidWhereQuery[1])
            .andWhere(columnMajorWhereQuery[0], columnMajorWhereQuery[1])
            .andWhere(columnMinorWhereQuery[0], columnMinorWhereQuery[1])
            .andWhere(columnPatchWhereQuery[0], columnPatchWhereQuery[1])
            .getOne();

        if (_.isEmpty(spmPackageVersion)) {
            throw new Error('Package version not found, name: ' + spmPackage.name + ', version: ' + version);
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
            dependencies = await this.findDependencies(dbConn, dependPackageName, pkgDependencies[dependPackageName], dependencies, true);
        }

        return dependencies;
    }
}

export const api = new PostSearchDependence();
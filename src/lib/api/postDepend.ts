import "reflect-metadata";
import * as _ from "underscore";
import {Connection} from "typeorm";
import {Context as KoaContext, Middleware as KoaMiddleware} from "koa";
import {MiddlewareNext, ResponseSchema} from "../Router";
import {ConfigOptions} from "../Config";
import {SpmPackage} from "../entity/SpmPackage";
import {SpmPackageVersion} from "../entity/SpmPackageVersion";

interface DependSchema {
    [key: string]: {
        path: string,
        dependencies?: {
            [key: string]: string
        }
    }
}

class PostDepend {
    public method: string;
    public uri: string;
    public type: string;

    constructor() {
        this.method = 'post';
        this.uri = '/v1/depend';
        this.type = 'application/json; charset=utf-8';
    }

    public register(options: ConfigOptions, conn: Connection): Array<string | KoaMiddleware> {
        return [this.uri, this._validate(options, conn), this._execute(options, conn)];
    };

    protected _validate(options: ConfigOptions, conn?: Connection): KoaMiddleware {
        let _this = this;
        return async function (ctx: KoaContext, next:MiddlewareNext): Promise<void> {
            try {
                await _this.paramsValidate(ctx, options);
                await next();
            } catch (err) {
                let res = {} as ResponseSchema;
                res.code = -1;
                res.msg = err.message;
                ctx.body = res;
            }
        }
    }

    protected _execute(options: ConfigOptions, conn?: Connection): KoaMiddleware {
        let _this = this;
        return async function (ctx: KoaContext, next: MiddlewareNext): Promise<void> {
            ctx.body = await _this.handle(ctx, next, conn);
            await next();
        }
    }

    public async paramsValidate(ctx: KoaContext, options: ConfigOptions) {
        const params = ctx.request.body;
        if (!params.name || _.isEmpty(params.name)) {
            throw new Error("Name is required!")
        }

        if (!params.name || _.isEmpty(params.name)) {
            throw new Error("Name is required!")
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext, conn?: Connection): Promise<ResponseSchema> {

        let res = {} as ResponseSchema;
        try {
            const params = ctx.request.body;
            const [name, version] = params.name.split('@');
            res.code = 0;
            res.msg = await this.findDependencies(name, version, conn, {});
            return res;
        } catch (err) {
            res.code = -1;
            res.msg = err.message;
        }

        return res;
    };

    public async findDependencies(name: string, version: string, conn: Connection, dependencies: DependSchema) {

        // if dependencies is exist, return ..
        if (dependencies.hasOwnProperty(`${name}@${version}`)) {
            return dependencies;
        }

        if (!_.isEmpty(version)) {
            const [major, minor, patch] = version.split('.');

        }

        // find package
        let spmPackage = await conn
            .getRepository(SpmPackage)
            .createQueryBuilder("package")
            .where('package.name=:name', { name: name })
            .getOne();

        if (_.isEmpty(spmPackage)) {
            throw new Error("Package not found, name: " + name);
        }

        let spmPackageVersion: SpmPackageVersion;
        if (!_.isEmpty(version)) {
            const [major, minor, patch] = version.split('.');
            spmPackageVersion = await conn
                .getRepository(SpmPackageVersion)
                .createQueryBuilder("version")
                .where('version.pid=:pid', { pid: spmPackage.id })
                .andWhere('version.major=:major', { major: major })
                .andWhere('version.minor=:minor', { minor: minor })
                .andWhere('version.patch=:patch', { patch: patch })
                .getOne();
        } else {
            spmPackageVersion = await conn
                .getRepository(SpmPackageVersion)
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
        } catch (e) {
            //do nothing
        }

        dependencies[`${name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`] = {
            path: spmPackageVersion.filePath,
            dependencies: pkgDependencies
        };

        for (let pkgName in pkgDependencies) {
            dependencies = await this.findDependencies(pkgName, pkgDependencies[pkgName], conn, dependencies);
        }

        return dependencies;
    }
}

export const api = new PostDepend();
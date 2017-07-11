import "reflect-metadata";
import * as LibFs from "mz/fs";
import * as _ from "underscore";
import {Connection} from "typeorm";
import {Context as KoaContext, Middleware as KoaMiddleware} from "koa";
import {MiddlewareNext, ResponseSchema} from "../Router";
import {ConfigOptions} from "../Config";
import {SpmPackage} from "../entity/SpmPackage";
import {SpmPackageVersion} from "../entity/SpmPackageVersion";

class PostInstall {
    public method: string;
    public uri: string;
    public type: string;

    constructor() {
        this.method = 'post';
        this.uri = '/v1/install';
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
            let body = await _this.handle(ctx, next, conn);
            if (!_.isEmpty(body)) {
                ctx.body = body;
            }
            await next();
        }
    }

    public async paramsValidate(ctx: KoaContext, options: ConfigOptions) {
        const params = ctx.request.body;
        if (!params.name || _.isEmpty(params.name)) {
            throw new Error("Name is required!")
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext, conn?: Connection): Promise<ResponseSchema> {

        let res = {} as ResponseSchema;
        try {
            const params = ctx.request.body;
            let [name, version] = params.name.split('@');

            // find package
            let spmPackage = await conn
                .getRepository(SpmPackage)
                .createQueryBuilder("package")
                .where('package.name=:name', { name: name })
                .getOne();

            if (_.isEmpty(spmPackage)) {
                res.code = -1;
                res.msg = "Package not found, name: " + name;
                return res;
            }

            let spmPackageVersion: SpmPackageVersion;
            if (!_.isEmpty(version)) {
                const [major, minor, patch] = version.split('.');

                // find package version
                spmPackageVersion = await conn
                    .getRepository(SpmPackageVersion)
                    .createQueryBuilder("version")
                    .where('version.pid=:pid', { pid: spmPackage.id })
                    .andWhere('version.major=:major', { major: major })
                    .andWhere('version.minor=:minor', { minor: minor })
                    .andWhere('version.patch=:patch', { patch: patch })
                    .getOne();
            } else {
                // find package version
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
                res.code = -1;
                res.msg = "Package version not found, name: " + name;
                return res;
            }

            let fileStat = await LibFs.stat(spmPackageVersion.filePath);
            if (fileStat.isFile()) {
                ctx.body = LibFs.createReadStream(spmPackageVersion.filePath);
                ctx.set('Content-Disposition', `attachment; filename=${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
                return;
            } else {
                res.code = -1;
                res.msg = "Package file not found, path: " + spmPackageVersion.filePath;
            }

            return res;
        } catch (err) {
            res.code = -1;
            res.msg = err.message;
        }

        return res;
    };
}

export const api = new PostInstall();
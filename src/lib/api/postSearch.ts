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

class PostSearch {
    public method: string;
    public uri: string;
    public type: string;

    constructor() {
        this.method = 'post';
        this.uri = '/v1/search';
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
        if (!params.keyword || _.isEmpty(params.keyword)) {
            throw new Error("keyword is required!")
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext, conn?: Connection): Promise<ResponseSchema> {

        let res = {} as ResponseSchema;
        try {
            const params = ctx.request.body;

            let pkgNames = [];

            // find package
            let spmPackageList = await conn
                .getRepository(SpmPackage)
                .createQueryBuilder("package")
                .where('package.name LIKE :keyword', { keyword: `%${params.keyword}%` })
                .getMany();

            for (let spmPackage of spmPackageList) {
                let spmPackageVersion = await conn
                    .getRepository(SpmPackageVersion)
                    .createQueryBuilder("version")
                    .where('version.pid=:pid', { pid: spmPackage.id })
                    .orderBy("version.major", "DESC")
                    .addOrderBy("version.minor", "DESC")
                    .addOrderBy("version.patch", "DESC")
                    .getOne();

                if (!_.isEmpty(spmPackageVersion)) {
                   pkgNames.push(`${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`)
                }
            }

            res.code = 0;
            res.msg = pkgNames;
            return res;
        } catch (err) {
            res.code = -1;
            res.msg = err.message;
        }

        return res;
    };
}

export const api = new PostSearch();
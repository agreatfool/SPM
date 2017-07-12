import "reflect-metadata";
import * as LibFs from "mz/fs";
import * as _ from "underscore";
import {Connection} from "typeorm";
import {Context as KoaContext, Middleware as KoaMiddleware} from "koa";
import {MiddlewareNext, ResponseSchema} from "../Router";
import {ConfigOptions} from "../Config";
import {ReadStream} from "fs";

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
            ctx.body = await _this.handle(ctx, next, conn);
            await next();
        }
    }

    public async paramsValidate(ctx: KoaContext, options: ConfigOptions) {
        const params = ctx.request.body;
        if (!params.path || _.isEmpty(params.path)) {
            throw new Error("path is required!")
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext, conn?: Connection): Promise<ResponseSchema | ReadStream> {

        let res = {} as ResponseSchema;
        try {
            const params = ctx.request.body;

            let fileStat = await LibFs.stat(params.path);
            if (fileStat.isFile()) {
                ctx.set('Content-Disposition', `attachment; filename="tmp.zip"`);
                return LibFs.createReadStream(params.path);
            } else {
                res.code = -1;
                res.msg = "Package file not found, path: " + params.path;
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
import {Connection} from "typeorm";
import {ConfigOptions} from "./Config";
import {Context as KoaContext, Middleware as KoaMiddleware} from "koa";
import {MiddlewareNext, ResponseSchema} from "./Router";

export abstract class ApiBase {

    public method: string;
    public uri: string;
    public type: string;
    public options: ConfigOptions;
    public dbHandler: Connection;

    public abstract handle(ctx: KoaContext, next: MiddlewareNext): Promise<any>;

    public abstract paramsValidate(ctx: KoaContext);

    public register(options: ConfigOptions, dbHandler: Connection): Array<string | KoaMiddleware> {
        this.options = options;
        this.dbHandler = dbHandler;
        return [this.uri, this._validate(), this._execute()];
    };

    protected _validate(): KoaMiddleware {
        let _this = this;
        return async function (ctx: KoaContext, next: MiddlewareNext): Promise<void> {
            try {
                await _this.paramsValidate(ctx);
                await next();
            } catch (err) {
                ctx.body = _this.buildResponse(err.message, -1);
            }
        }
    }

    protected _execute(): KoaMiddleware {
        let _this: ApiBase = this;
        return async function (ctx: KoaContext, next: MiddlewareNext): Promise<void> {
            ctx.body = await _this.handle(ctx, next);
            await next();
        }
    }

    public buildResponse(msg: any, code: number = 0): ResponseSchema {
        if (code < 0) {
            console.log(`[${this.uri}]: ${msg}`)
        }

        return {
            code: code,
            msg: msg
        }
    }
}
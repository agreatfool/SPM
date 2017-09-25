import {Context as KoaContext, Middleware as KoaMiddleware} from 'koa';
import * as md5 from 'md5';

export interface ResponseSchema {
    code: number;
    msg: string | object;
}

export type MiddlewareNext = () => Promise<any>;

export abstract class ApiBase {

    public method: string;
    public uri: string;
    public type: string;

    public abstract handle(ctx: KoaContext, next: MiddlewareNext): Promise<any>;

    public abstract paramsValidate(ctx: KoaContext);

    public register(): Array<string | KoaMiddleware> {
        return [this.uri, this._validate(), this._execute()];
    };

    protected _validate(): KoaMiddleware {
        return async (ctx: KoaContext, next: MiddlewareNext): Promise<void> => {
            try {
                await this.paramsValidate(ctx);
                await next();
            } catch (err) {
                ctx.body = this.buildResponse(err.message, -1);
            }
        };
    }

    protected _execute(): KoaMiddleware {
        return async (ctx: KoaContext, next: MiddlewareNext): Promise<void> => {
            ctx.body = await this.handle(ctx, next);
            await next();
        };
    }

    public buildResponse(msg: any, code: number = 0): ResponseSchema {
        if (code < 0) {
            console.log(`[${this.uri}]: ${msg}`);
        }

        return {
            code: code,
            msg: msg
        };
    }

    public static genSecretToken(key1: string, key2: string, time: number): string {
        return md5(key1 + key2 + time.toString()).substr(0, 8);
    }
}
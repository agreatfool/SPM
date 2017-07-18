import "reflect-metadata";
import * as LibFs from "mz/fs";
import * as _ from "underscore";
import {ReadStream} from "fs";
import {Context as KoaContext} from "koa";
import {MiddlewareNext, ResponseSchema} from "../Router";
import {ApiBase} from "../ApiBase";

class PostInstall extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/install';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const params = ctx.request.body;

        if (!params.path || _.isEmpty(params.path)) {
            throw new Error("path is required!");
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema | ReadStream> {
        try {
            const params = ctx.request.body;
            if (LibFs.statSync(params.path).isFile()) {
                ctx.set('Content-Disposition', `attachment; filename="tmp.zip"`);
                return LibFs.createReadStream(params.path);
            } else {
                return this.buildResponse("Package file not found, path: " + params.path, -1);
            }
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };
}

export const api = new PostInstall();
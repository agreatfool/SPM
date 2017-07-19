import "reflect-metadata";
import * as _ from "underscore";
import Config from "../Config";
import Database from "../Database";
import {Context as KoaContext} from "koa";
import {SpmPackageSecret} from "../entity/SpmPackageSecret";
import {ApiBase, MiddlewareNext, ResponseSchema} from "../ApiBase";

class PostRegister extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/secret';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const params = (ctx.request as any).body;
        if (!params.name || _.isEmpty(params.name)) {
            throw new Error('name is required!');
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        try {
            const params = (ctx.request as any).body;
            const dbConn = Database.instance().conn;

            // find package
            let spmPackageSecret = await dbConn
                .getRepository(SpmPackageSecret)
                .createQueryBuilder('user')
                .where('user.name=:name', {name: params.name})
                .getOne();

            // if package is not found, create package
            if (!_.isEmpty(spmPackageSecret)) {
                return this.buildResponse('secret already exists', -1);
            }

            let entity = new SpmPackageSecret();
            entity.name = params.name;
            entity.secret = ApiBase.genSecretToken(params.username, Config.instance().options.secret, Math.round(new Date().getTime() / 1000));
            spmPackageSecret = await dbConn.manager.save(entity);

            return this.buildResponse({secret: spmPackageSecret.secret});
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };
}

export const api = new PostRegister();
import 'reflect-metadata';
import * as _ from 'underscore';
import Config from '../Config';
import Database from '../Database';
import {Context as KoaContext} from 'koa';
import {SpmPackageSecret} from '../entity/SpmPackageSecret';
import {ApiBase, MiddlewareNext, ResponseSchema} from '../ApiBase';
import {SpmPackage} from '../entity/SpmPackage';

interface SecretParams {
    name: string;
}

class PostSecret extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/secret';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const params = (ctx.request as any).body as SecretParams;
        if (!params.name || _.isEmpty(params.name)) {
            throw new Error('Param name is required!');
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        try {
            const params = (ctx.request as any).body as SecretParams;
            const dbConn = Database.instance().conn;

            // 查询 spmPackage
            const spmPackage = await dbConn
                .getRepository(SpmPackage)
                .findOne({name: params.name})
            if (!spmPackage) {
              return this.buildResponse(`package ${params.name} does not exist.`, -1);
            }

            // find package secret
            let spmPackageSecret = await dbConn
                .getRepository(SpmPackageSecret)
                .createQueryBuilder('pkgSecret')
                .where('pkgSecret.pid=:pid', {pid: spmPackage.id})
                .getOne();

            // if package is not found, create package
            if (!_.isEmpty(spmPackageSecret)) {
                return this.buildResponse('secret already exists', -1);
            }

            let entity = new SpmPackageSecret();
            entity.pid = spmPackage.id;
            entity.secret = ApiBase.genSecretToken(params.name, Config.instance().options.secret, Math.round(new Date().getTime() / 1000));
            spmPackageSecret = await dbConn.manager.save(entity);

            return this.buildResponse({secret: spmPackageSecret.secret});
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };
}

export const api = new PostSecret();

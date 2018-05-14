import "reflect-metadata";
import * as _ from "underscore";
import Database from "../Database";
import {Context as KoaContext} from "koa";
import {ApiBase, MiddlewareNext, ResponseSchema} from "../ApiBase";
import {SpmGlobalSecret} from "../entity/SpmGlobalSecret";
import {SpmPackageSecret} from "../entity/SpmPackageSecret";
import {PackageState} from "../Const.tx";

interface ChangeSecretParams {
    packageName: string;
    userSecret: string;
    pkgSecret: string;
}

class PostChangeSecret extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/change_secret';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const params = (ctx.request as any).body as ChangeSecretParams;
        if (!params.packageName || _.isEmpty(params.packageName)) {
            throw new Error('PackageName is required!');
        }
        if (!params.userSecret || _.isEmpty(params.userSecret)) {
            throw new Error('Password is required!');
        }
        if (!params.pkgSecret || _.isEmpty(params.pkgSecret)) {
            throw new Error('New package secret is required!');
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        try {
            let params = (ctx.request as any).body as ChangeSecretParams;
            let globalSecretEntity: SpmGlobalSecret = await Database.instance().conn
                .getRepository(SpmGlobalSecret)
                .createQueryBuilder('g')
                .getOne();
            if (globalSecretEntity.secret !== params.userSecret) {
                return this.buildResponse(`Password error`, -1);
            }

            await this._changeSecret(params);
            return this.buildResponse(`Change secret successfully!`, 0);
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };

    private async _changeSecret(params: ChangeSecretParams): Promise<void> {
        let pkgSecretRepo = Database.instance().conn.getRepository(SpmPackageSecret);
        let pkgSecret = await pkgSecretRepo.findOne({name: params.packageName, state: PackageState.ENABLED});
        pkgSecret.secret = params.pkgSecret;
        await pkgSecretRepo.save(pkgSecret);
    }
}

export const api = new PostChangeSecret();

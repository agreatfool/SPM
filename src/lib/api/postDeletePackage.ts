import "reflect-metadata";
import * as _ from "underscore";
import Database from "../Database";
import {Context as KoaContext} from "koa";
import {ApiBase, MiddlewareNext, ResponseSchema} from "../ApiBase";
import {SpmGlobalSecret} from "../entity/SpmGlobalSecret";
import {SpmPackage} from "../entity/SpmPackage";
import {SpmPackageSecret} from "../entity/SpmPackageSecret";
import {PackageState} from "../Const.tx";
import {SpmPackageVersion} from "../entity/SpmPackageVersion";

interface DeleteSecretParams {
    packageName: string;
    secret: string;
}

class PostDeletePackage extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/delete_package';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const params = (ctx.request as any).body as DeleteSecretParams;
        if (!params.packageName || _.isEmpty(params.packageName)) {
            throw new Error('PackageName is required!');
        }
        if (!params.secret || _.isEmpty(params.secret)) {
            throw new Error('Password is required!');
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        try {
            let params = (ctx.request as any).body as DeleteSecretParams;
            let globalSecretEntity: SpmGlobalSecret = await Database.instance().conn
                .getRepository(SpmGlobalSecret)
                .createQueryBuilder('g')
                .getOne();
            if (globalSecretEntity.secret !== params.secret) {
                return this.buildResponse(`Password error`, -1);
            }

            await this._deletePackage(params);
            return this.buildResponse(`Delete package successfully!`, 0);
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };

    private async _deletePackage(params: DeleteSecretParams): Promise<void> {
        let pkgRepo = Database.instance().conn.getRepository(SpmPackage);
        let pkg = await pkgRepo.findOne({name: params.packageName, state: PackageState.ENABLED});
        pkg.state = PackageState.DISABLED;
        await pkgRepo.save(pkg);

        let pkgSecretRepo = Database.instance().conn.getRepository(SpmPackageSecret);
        let pkgSecret = await pkgSecretRepo.findOne({name: params.packageName, state: PackageState.ENABLED});
        pkgSecret.state = PackageState.DISABLED;
        await pkgSecretRepo.save(pkgSecret);

        let pkgVersionRepo = Database.instance().conn.getRepository(SpmPackageVersion);
        let pkgVersionList = await pkgVersionRepo.find({name: params.packageName, state: PackageState.ENABLED});
        for (let pkgVersion of pkgVersionList) {
            pkgVersion.state = PackageState.DISABLED;
        }
        await pkgVersionRepo.save(pkgVersionList);
    }
}

export const api = new PostDeletePackage();

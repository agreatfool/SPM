import 'reflect-metadata';
import * as _ from 'underscore';
import * as LibFs from 'fs';
import Database from '../Database';
import {Context as KoaContext} from 'koa';
import {ApiBase, MiddlewareNext, ResponseSchema} from '../ApiBase';
import {SpmGlobalSecret} from '../entity/SpmGlobalSecret';
import {SpmPackage} from '../entity/SpmPackage';
import {SpmPackageSecret} from '../entity/SpmPackageSecret';
import {SpmPackageVersion} from '../entity/SpmPackageVersion';

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
            throw new Error('Secret is required!');
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
                return this.buildResponse(`Secret error`, -1);
            }

            await this._deletePackage(params);
            return this.buildResponse(`The package was successfully deleted!`, 0);
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };

    private async _deletePackage(params: DeleteSecretParams): Promise<void> {
        let pkgRepo = Database.instance().conn.getRepository(SpmPackage);
        let pkg = await pkgRepo.findOne({name: params.packageName});
        let pkgId = pkg.id;
        await pkgRepo.remove(pkg);

        let pkgSecretRepo = Database.instance().conn.getRepository(SpmPackageSecret);
        let pkgSecret = await pkgSecretRepo.findOne({pid: pkgId});
        await pkgSecretRepo.remove(pkgSecret);

        let pkgVersionRepo = Database.instance().conn.getRepository(SpmPackageVersion);
        let pkgVersionList = await pkgVersionRepo.find({pid: pkgId});
        for (let pkgVersion of pkgVersionList) {
            LibFs.unlinkSync(pkgVersion.filePath);
            await pkgVersionRepo.remove(pkgVersion);
        }
    }
}

export const api = new PostDeletePackage();

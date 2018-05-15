import 'reflect-metadata';
import * as _ from 'underscore';
import Database from '../Database';
import {Context as KoaContext} from 'koa';
import {SpmPackageVersion} from '../entity/SpmPackageVersion';
import {ApiBase, MiddlewareNext, ResponseSchema} from '../ApiBase';
import {SpmPackage} from '../entity/SpmPackage';

interface SearchLatestParams {
    packageName: string;
    major?: number
}

class PostSearchLatest extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/search_latest';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const params = (ctx.request as any).body as SearchLatestParams;
        if (!params.packageName || _.isEmpty(params.packageName)) {
            throw new Error('packageName is required!');
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        try {
            let params = (ctx.request as any).body as SearchLatestParams;
            // 查询 spmPackage
            const spmPackage = await Database.instance().conn
                .getRepository(SpmPackage)
                .findOne({name: params.packageName})
            if (!spmPackage) {
              return this.buildResponse(`package ${params.packageName} does not exist.`, -1);
            }

            let sheetName = 'version';
            let spmPackageVersion: SpmPackageVersion;
            if (!params.major) {
                // 如果查询参数有 major，则查询 minor 和 patch 最高的版本
                spmPackageVersion = await Database.instance().conn
                    .getRepository(SpmPackageVersion)
                    .createQueryBuilder(sheetName)
                    .where(`${sheetName}.pid = :pid`, {pid: spmPackage.id})
                    .orderBy(`${sheetName}.major`, 'DESC')
                    .addOrderBy(`${sheetName}.minor`, 'DESC')
                    .addOrderBy(`${sheetName}.patch`, 'DESC')
                    .getOne();
            } else {
                // 如果查询参数没有 major，则查询 major，minor 和 patch 均为最高的版本
                spmPackageVersion = await Database.instance().conn
                    .getRepository(SpmPackageVersion)
                    .createQueryBuilder(sheetName)
                    .where(`${sheetName}.pid = :pid`, {pid: spmPackage.id})
                    .andWhere(`${sheetName}.major = :major`, {major: params.major})
                    .orderBy(`${sheetName}.minor`, 'DESC')
                    .addOrderBy(`${sheetName}.patch`, 'DESC')
                    .getOne();
            }
            if (!spmPackageVersion) {
                return this.buildResponse(`package ${params.packageName} does not exist.`, -1);
            }
            return this.buildResponse(`${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };
}

export const api = new PostSearchLatest();

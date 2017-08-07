import "reflect-metadata";
import * as _ from "underscore";
import Database from "../Database";
import {Context as KoaContext} from "koa";
import {SpmPackage} from "../entity/SpmPackage";
import {SpmPackageVersion} from "../entity/SpmPackageVersion";
import {ApiBase, MiddlewareNext, ResponseSchema} from "../ApiBase";
import {Connection} from "typeorm";

interface SearchParams {
    keyword: string;
    info?: string;
}

class PostSearch extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/search';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const params = (ctx.request as any).body as SearchParams;
        if (!params.keyword || _.isEmpty(params.keyword)) {
            throw new Error('keyword is required!');
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        try {
            const params = (ctx.request as any).body as SearchParams;
            const dbConn = Database.instance().conn;
            if (params.info == 'true') {
                return this.buildResponse(await this.preciseQuery(params.keyword, dbConn));
            } else {
                return this.buildResponse(await this.fuzzyQuery(params.keyword, dbConn));
            }
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };

    public async fuzzyQuery(keyword: string, dbConn: Connection): Promise<Array<SpmPackage>> {
        let packageInfos = [] as Array<SpmPackage>;
        let spmPackageList = await dbConn
            .getRepository(SpmPackage)
            .createQueryBuilder('package')
            .where('package.name LIKE :keyword', {keyword: `%${keyword}%`})
            .orWhere('package.description LIKE :keyword', {keyword: `%${keyword}%`})
            .getMany();
        for (let spmPackage of spmPackageList) {
            packageInfos.push(spmPackage);
        }

        return packageInfos;
    }

    public async preciseQuery(keyword: string, dbConn: Connection): Promise<Array<[SpmPackage, SpmPackageVersion]>> {
        let packageInfos = [] as Array<[SpmPackage, SpmPackageVersion]>;
        let spmPackage = await dbConn
            .getRepository(SpmPackage)
            .createQueryBuilder('package')
            .where('package.name=:keyword', {keyword: `${keyword}`})
            .getOne();

        if (_.isEmpty(spmPackage)) {
            return packageInfos;
        }

        let spmPackageVersionList = await dbConn
            .getRepository(SpmPackageVersion)
            .createQueryBuilder('version')
            .where('version.pid=:pid', {pid: spmPackage.id})
            .getMany();

        for (let spmPackageVersion of spmPackageVersionList) {
            packageInfos.push([spmPackage, spmPackageVersion]);
        }

        return packageInfos;
    }
}

export const api = new PostSearch();
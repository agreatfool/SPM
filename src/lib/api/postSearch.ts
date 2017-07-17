import "reflect-metadata";
import * as _ from "underscore";
import {Context as KoaContext} from "koa";
import {MiddlewareNext, ResponseSchema} from "../Router";
import {SpmPackage} from "../entity/SpmPackage";
import {SpmPackageVersion} from "../entity/SpmPackageVersion";
import {ApiBase} from "../ApiBase";

class PostSearch extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/search';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const params = ctx.request.body;
        if (!params.keyword || _.isEmpty(params.keyword)) {
            throw new Error("keyword is required!");
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        try {
            const params = ctx.request.body;
            if (params.info == 'true') {
                return this.buildResponse(await this.preciseSearch(params.keyword));
            } else {
                return this.buildResponse(await this.fuzzySearch(params.keyword));
            }
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };

    public async fuzzySearch(keyword: string): Promise<Array<string>> {
        let packages = [];
        let spmPackageList = await this.dbHandler
            .getRepository(SpmPackage)
            .createQueryBuilder("package")
            .where('package.name LIKE :keyword', {keyword: `%${keyword}%`})
            .getMany();
        for (let spmPackage of spmPackageList) {
            packages.push(`${spmPackage.name}`);
        }

        return packages;
    }

    public async preciseSearch(keyword: string): Promise<Array<string>> {
        let packages = [];
        let spmPackage = await this.dbHandler
            .getRepository(SpmPackage)
            .createQueryBuilder("package")
            .where('package.name=:keyword', {keyword: `${keyword}`})
            .getOne();

        if (_.isEmpty(spmPackage)) {
            return packages;
        }

        let spmPackageVersionList = await this.dbHandler
            .getRepository(SpmPackageVersion)
            .createQueryBuilder("version")
            .where('version.pid=:pid', {pid: spmPackage.id})
            .getMany();

        for (let spmPackageVersion of spmPackageVersionList) {
            packages.push(`${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`);
        }

        return packages;
    }
}

export const api = new PostSearch();
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

            let packages = [];
            let [name, version] = params.keyword.split('@');

            // find package
            let spmPackageList = await this.dbHandler
                .getRepository(SpmPackage)
                .createQueryBuilder("package")
                .where('package.name LIKE :keyword', {keyword: `%${name}%`})
                .getMany();

            for (let spmPackage of spmPackageList) {

                let spmPackageVersion: SpmPackageVersion;
                if (!_.isEmpty(version)) {
                    const [major, minor, patch] = version.split('.');
                    spmPackageVersion = await this.dbHandler
                        .getRepository(SpmPackageVersion)
                        .createQueryBuilder("version")
                        .where('version.pid=:pid', {pid: spmPackage.id})
                        .andWhere('version.major=:major', {major: major})
                        .andWhere('version.minor=:minor', {minor: minor})
                        .andWhere('version.patch=:patch', {patch: patch})
                        .getOne();
                } else {
                    spmPackageVersion = await this.dbHandler
                        .getRepository(SpmPackageVersion)
                        .createQueryBuilder("version")
                        .where('version.pid=:pid', {pid: spmPackage.id})
                        .orderBy("version.major", "DESC")
                        .addOrderBy("version.minor", "DESC")
                        .addOrderBy("version.patch", "DESC")
                        .getOne();
                }

                if (!_.isEmpty(spmPackageVersion)) {
                    packages.push(`${spmPackage.name}@${spmPackageVersion.major}.${spmPackageVersion.minor}.${spmPackageVersion.patch}`)
                }
            }

            return this.buildResponse(packages);
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };
}

export const api = new PostSearch();
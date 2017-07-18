import "reflect-metadata";
import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as _ from "underscore";
import {Context as KoaContext} from "koa";
import {MiddlewareNext, ResponseSchema} from "../Router";
import {SpmPackage} from "../entity/SpmPackage";
import {SpmPackageVersion} from "../entity/SpmPackageVersion";
import {ApiBase} from "../ApiBase";
import {version} from "punycode";

class PostPublish extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/publish';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const body = ctx.request.body;
        const params = body.fields;

        if (!params.secret || params.secret != this.options.secret) {
            throw new Error("Secret is required!");
        }

        if (!params.name || _.isEmpty(params.name)) {
            throw new Error("Name is required!");
        }

        if (!params.version || _.isEmpty(params.version)) {
            throw new Error("Version is required!");
        }

        if (!body.hasOwnProperty("files") || !body.files.hasOwnProperty("fileUpload")) {
            throw new Error("fileUpload is required!");
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        // file upload
        const params = ctx.request.body.fields;
        for (let key in params) {
            params[key] = decodeURIComponent(params[key]);
        }

        // read upload stream
        const fileUpload = ctx.request.body.files['fileUpload'];
        const fileStream = LibFs.createReadStream(fileUpload.path).on('end', async () => {
            await LibFs.unlink(fileUpload.path);
        });

        // write file stream
        const writeFilePath = LibPath.join(__dirname, '..', '..', '..', 'store', `${params.name}@${params.version}.zip`);
        const writeFileStream = LibFs.createWriteStream(writeFilePath);
        await fileStream.pipe(writeFileStream);

        try {
            const [major, minor, patch] = params.version.split('.');

            // find package
            let spmPackage = await this.dbHandler
                .getRepository(SpmPackage)
                .createQueryBuilder("package")
                .where('package.name=:name', {name: params.name})
                .getOne();

            // if package is not found, create package
            if (_.isEmpty(spmPackage)) {
                let entity = new SpmPackage();
                entity.name = params.name;
                entity.description = params.description;
                spmPackage = await this.dbHandler.manager.persist(entity);
            } else {
                let entity = new SpmPackage();
                entity.id = spmPackage.id;
                entity.description = params.description;
                spmPackage = await this.dbHandler.manager.persist(entity);
            }

            // find package version
            let spmPackageVersion = await this.dbHandler
                .getRepository(SpmPackageVersion)
                .createQueryBuilder("version")
                .where('version.pid=:pid', {pid: spmPackage.id})
                .andWhere('version.major=:major', {major: major})
                .andWhere('version.minor=:minor', {minor: minor})
                .andWhere('version.patch=:patch', {patch: patch})
                .getOne();

            if (!_.isEmpty(spmPackageVersion)) {
                return this.buildResponse(`Proto is exist! name:${params.name}, version:${params.version}`, -1);
            }

            // if version is not found, create version
            let entity = new SpmPackageVersion();
            entity.pid = spmPackage.id;
            entity.major = major | 0;
            entity.minor = minor | 0;
            entity.patch = patch | 0;
            entity.filePath = writeFilePath;
            entity.time = new Date().getTime();
            entity.dependencies = params.dependencies;
            await this.dbHandler.manager.persist(entity);

            return this.buildResponse("succeed");
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };
}

export const api = new PostPublish();
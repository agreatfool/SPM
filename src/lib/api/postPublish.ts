import "reflect-metadata";
import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as _ from "underscore";
import Database from "../Database";
import {Context as KoaContext} from "koa";
import {SpmPackage} from "../entity/SpmPackage";
import {SpmPackageVersion} from "../entity/SpmPackageVersion";
import {SpmPackageSecret} from "../entity/SpmPackageSecret";
import {ApiBase, MiddlewareNext, ResponseSchema} from "../ApiBase";

class PostPublish extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/publish';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const body = (ctx.request as any).body;
        const params = body.fields;

        if (!params.secret || _.isEmpty(params.secret)) {
            throw new Error('Secret is wrong!');
        }

        if (!params.name || _.isEmpty(params.name)) {
            throw new Error('Name is required!');
        }

        if (!params.version || _.isEmpty(params.version)) {
            throw new Error('Version is required!');
        }

        if (!body.hasOwnProperty('files') || !body.files.hasOwnProperty('fileUpload')) {
            throw new Error('fileUpload is required!');
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext): Promise<ResponseSchema> {
        const dbConn = Database.instance().conn;
        const params = (ctx.request as any).body.fields;

        // find package
        let spmPackageSecret = await dbConn
            .getRepository(SpmPackageSecret)
            .createQueryBuilder('user')
            .where('user.name=:name', {name: params.name})
            .getOne();

        if (_.isEmpty(spmPackageSecret) || spmPackageSecret.secret !== params.secret) {
            return this.buildResponse('Wrong secret', -1);
        }
        
        // file upload
        for (let key in params) {
            params[key] = decodeURIComponent(params[key]);
        }

        // read upload stream
        const fileUpload = (ctx.request as any).body.files['fileUpload'];
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
            let spmPackage = await dbConn
                .getRepository(SpmPackage)
                .createQueryBuilder('package')
                .where('package.name=:name', {name: params.name})
                .getOne();

            // if package is not found, create package
            if (_.isEmpty(spmPackage)) {
                let entity = new SpmPackage();
                entity.sid = spmPackageSecret.id;
                entity.name = params.name;
                entity.description = params.description;
                spmPackage = await dbConn.manager.save(entity);
            } else {
                let entity = new SpmPackage();
                entity.id = spmPackage.id;
                entity.description = params.description;
                spmPackage = await dbConn.manager.save(entity);
            }

            // find package version
            let spmPackageVersion = await dbConn
                .getRepository(SpmPackageVersion)
                .createQueryBuilder('version')
                .where('version.pid=:pid', {pid: spmPackage.id})
                .andWhere('version.major=:major', {major: major})
                .andWhere('version.minor=:minor', {minor: minor})
                .andWhere('version.patch=:patch', {patch: patch})
                .getOne();

            if (!_.isEmpty(spmPackageVersion)) {
                return this.buildResponse(`Proto already exists! name:${params.name}, version:${params.version}`, -1);
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
            await dbConn.manager.save(entity);

            return this.buildResponse('succeed');
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };
}

export const api = new PostPublish();
import 'reflect-metadata';
import * as LibPath from 'path';
import * as LibFs from 'mz/fs';
import * as _ from 'underscore';
import Database from '../Database';
import {Context as KoaContext} from 'koa';
import {SpmPackage} from '../entity/SpmPackage';
import {SpmPackageVersion} from '../entity/SpmPackageVersion';
import {SpmPackageSecret} from '../entity/SpmPackageSecret';
import {ApiBase, MiddlewareNext, ResponseSchema} from '../ApiBase';
import {mkdir, Spm} from '../../bin/lib/lib';

interface PublishParams {
    fields: {
        secret: string;
        name: string;
        version: string;
        description: string;
        dependencies: string;
    };
    files?: {
        fileUpload: {
            path: string;
        };
    };
}

class PostPublish extends ApiBase {

    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/publish';
        this.type = 'application/json; charset=utf-8';
    }

    public async paramsValidate(ctx: KoaContext) {
        const body = (ctx.request as any).body as PublishParams;
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
        const body = (ctx.request as any).body as PublishParams;
        const params = body.fields;

        // find package
        const spmPackageRepo = dbConn.getRepository(SpmPackage);
        const spmPackage = await spmPackageRepo.findOne({name: params.name});
        if (!spmPackage) {
            return this.buildResponse(`Package ${params.name} does not exist.`, -1);
        }

        // find package secret
        let spmPackageSecret = await dbConn
            .getRepository(SpmPackageSecret)
            .findOne({pid: spmPackage.id});

        if (_.isEmpty(spmPackageSecret) || spmPackageSecret.secret !== params.secret) {
            return this.buildResponse('Wrong secret', -1);
        }

        // file upload
        for (let key in params) {
            params[key] = decodeURIComponent(params[key]);
        }

        // read upload stream
        const storePath = LibPath.join(Spm.SPM_ROOT_PATH, 'store');
        await mkdir(storePath);

        const fileUpload = body.files['fileUpload'];
        const fileStream = LibFs.createReadStream(fileUpload.path).on('end', async () => {
            await LibFs.unlink(fileUpload.path);
        });

        // generate writeFilePath
        const writeFilePath = LibPath.join(storePath, `${params.name}@${params.version}.zip`);

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
                entity.name = params.name;
                entity.description = params.description;
                spmPackage = await dbConn.manager.save(entity);
            } else {
                spmPackage.description = params.description;
                spmPackage = await dbConn.manager.save(spmPackage);
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
            entity.major = parseInt(major) | 0;
            entity.minor = parseInt(minor) | 0;
            entity.patch = parseInt(patch) | 0;
            entity.filePath = writeFilePath;
            entity.time = new Date().getTime();
            entity.dependencies = params.dependencies;
            await dbConn.manager.save(entity);

            // write file stream
            const writeFileStream = LibFs.createWriteStream(writeFilePath);
            await fileStream.pipe(writeFileStream);

            return this.buildResponse('succeed');
        } catch (err) {
            return this.buildResponse(err.message, -1);
        }
    };
}

export const api = new PostPublish();

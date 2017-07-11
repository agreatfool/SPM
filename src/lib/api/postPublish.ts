import "reflect-metadata";
import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as _ from "underscore";
import {Connection} from "typeorm";
import {Context as KoaContext, Middleware as KoaMiddleware} from "koa";
import {MiddlewareNext, ResponseSchema} from "../Router";
import {ConfigOptions} from "../Config";
import {SpmPackage} from "../entity/SpmPackage";
import {SpmPackageVersion} from "../entity/SpmPackageVersion";

class PostPublish {
    public method: string;
    public uri: string;
    public type: string;

    constructor() {
        this.method = 'post';
        this.uri = '/v1/publish';
        this.type = 'application/json; charset=utf-8';
    }

    public register(options: ConfigOptions, conn: Connection): Array<string | KoaMiddleware> {
        return [this.uri, this._validate(options, conn), this._execute(options, conn)];
    };

    protected _validate(options: ConfigOptions, conn?: Connection): KoaMiddleware {
        let _this = this;
        return async function (ctx: KoaContext, next:MiddlewareNext): Promise<void> {
            try {
                await _this.paramsValidate(ctx, options);
                await next();
            } catch (err) {
                let res = {} as ResponseSchema;
                res.code = -1;
                res.msg = err.message;
                ctx.body = res;
            }
        }
    }

    protected _execute(options: ConfigOptions, conn?: Connection): KoaMiddleware {
        let _this = this;
        return async function (ctx: KoaContext, next: MiddlewareNext): Promise<void> {
            ctx.body = await _this.handle(ctx, next, conn);
            await next();
        }
    }

    public async paramsValidate(ctx: KoaContext, options: ConfigOptions) {
        const body = ctx.request.body;
        const params = body.fields;

        if (!params.secret || params.secret != options.secret) {
            throw new Error("Secret is required!")
        }

        if (!params.name || _.isEmpty(params.name)) {
            throw new Error("Name is required!")
        }

        if (!params.version || _.isEmpty(params.version)) {
            throw new Error("Version is required!")
        }

        if (!body.hasOwnProperty("files") || !body.files.hasOwnProperty("fileUpload")) {
            throw new Error("fileUpload is required!");
        }
    }

    public async handle(ctx: KoaContext, next: MiddlewareNext, conn?: Connection): Promise<ResponseSchema> {
        // file upload
        const fileUpload = ctx.request.body.files['fileUpload'];
        const filePath = LibPath.join(__dirname, '..', '..', '..', 'store', fileUpload.name);
        const reader = LibFs.createReadStream(fileUpload.path);
        const stream = LibFs.createWriteStream(filePath);
        await reader.pipe(stream);
        await LibFs.unlink(fileUpload.path);

        let res = {} as ResponseSchema;
        try {
            const params = ctx.request.body.fields;
            const [major, minor, patch] = params.version.split('.');

            // find package
            let spmPackage = await conn
                .getRepository(SpmPackage)
                .createQueryBuilder("package")
                .where('package.name=:name', { name: params.name })
                .getOne();

            // if package is not found, create package
            if (_.isEmpty(spmPackage)) {
                let entity = new SpmPackage();
                entity.name = params.name;
                spmPackage = await conn.manager.persist(entity);
            }
            // find package version
            let spmPackageVersion = await conn
                .getRepository(SpmPackageVersion)
                .createQueryBuilder("version")
                .where('version.pid=:pid', { pid: spmPackage.id })
                .andWhere('version.major=:major', { major: major })
                .andWhere('version.minor=:minor', { minor: minor })
                .andWhere('version.patch=:patch', { patch: patch })
                .getOne();

            // if version is not found, create version
            if (_.isEmpty(spmPackageVersion)) {
                let entity = new SpmPackageVersion();
                entity.pid = spmPackage.id;
                entity.major = major | 0;
                entity.minor = minor | 0;
                entity.patch = patch | 0;
                entity.filePath = filePath;
                entity.time = new Date().getTime();
                spmPackageVersion = await conn.manager.persist(entity);
            }

            res.code = 0;
            res.msg = {spmPackage: spmPackage, spmPackageVersion: spmPackageVersion};
        } catch (err) {
            res.code = -1;
            res.msg = err.message;
        }

        return res;
    };
}

export const api = new PostPublish();
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const LibPath = require("path");
const LibFs = require("mz/fs");
const _ = require("underscore");
const SpmPackage_1 = require("../entity/SpmPackage");
const SpmPackageVersion_1 = require("../entity/SpmPackageVersion");
class PostPublish {
    constructor() {
        this.method = 'post';
        this.uri = '/v1/publish';
        this.type = 'application/json; charset=utf-8';
    }
    register(options, conn) {
        return [this.uri, this._validate(options, conn), this._execute(options, conn)];
    }
    ;
    _validate(options, conn) {
        let _this = this;
        return function (ctx, next) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    yield _this.paramsValidate(ctx, options);
                    yield next();
                }
                catch (err) {
                    _this.handleErrMsg(ctx, err);
                }
            });
        };
    }
    _execute(options, conn) {
        let _this = this;
        return function (ctx, next) {
            return __awaiter(this, void 0, void 0, function* () {
                ctx.body = yield _this.handle(ctx, next, conn);
                yield next();
            });
        };
    }
    paramsValidate(ctx, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = ctx.query;
            const body = ctx.request.body;
            if (!query.secret || query.secret != options.secret) {
                throw new Error("Secret is required!");
            }
            if (!query.name || _.isEmpty(query.name)) {
                throw new Error("Name is required!");
            }
            if (!query.version || _.isEmpty(query.version)) {
                throw new Error("Version is required!");
            }
            if (!body.hasOwnProperty("files") || !body.files.hasOwnProperty("fileUpload")) {
                throw new Error("fileUpload is required!");
            }
        });
    }
    handle(ctx, next, conn) {
        return __awaiter(this, void 0, void 0, function* () {
            // file upload
            const fileUpload = ctx.request.body.files['fileUpload'];
            const filePath = LibPath.join(__dirname, '..', '..', '..', 'store', fileUpload.name);
            const reader = LibFs.createReadStream(fileUpload.path);
            const stream = LibFs.createWriteStream(filePath);
            yield reader.pipe(stream);
            yield LibFs.unlink(fileUpload.path);
            try {
                const query = ctx.query;
                const [major, minor, patch] = ctx.query.version.split('.');
                // find package
                let spmPackage = yield conn
                    .getRepository(SpmPackage_1.SpmPackage)
                    .createQueryBuilder("package")
                    .where('package.name=:name', { name: query.name })
                    .getOne();
                // if package is not found, create package
                if (_.isEmpty(spmPackage)) {
                    console.log("Create package entity!");
                    let entity = new SpmPackage_1.SpmPackage();
                    entity.name = query.name;
                    spmPackage = yield conn.manager.persist(entity);
                }
                // find package version
                let spmPackageVersion = yield conn
                    .getRepository(SpmPackageVersion_1.SpmPackageVersion)
                    .createQueryBuilder("version")
                    .where('version.pid=:pid', { pid: spmPackage.id })
                    .andWhere('version.major=:major', { major: major | 0 })
                    .andWhere('version.minor=:minor', { minor: minor | 0 })
                    .andWhere('version.patch=:patch', { patch: patch | 0 })
                    .getOne();
                // if version is not found, create version
                if (_.isEmpty(spmPackageVersion)) {
                    console.log("Create package version entity!");
                    let entity = new SpmPackageVersion_1.SpmPackageVersion();
                    entity.pid = spmPackage.id;
                    entity.major = major | 0;
                    entity.minor = minor | 0;
                    entity.patch = patch | 0;
                    entity.filePath = filePath;
                    entity.time = new Date().getTime();
                    yield conn.manager.persist(entity);
                }
            }
            catch (err) {
                this.handleErrMsg(ctx, err);
            }
            let res = {};
            res.code = 0;
            res.msg = "succeed";
            return res;
        });
    }
    ;
    handleErrMsg(ctx, err) {
        let res = {};
        res.code = -1;
        res.msg = err.message;
        ctx.body = res;
    }
}
exports.api = new PostPublish();
//# sourceMappingURL=postPublish.js.map
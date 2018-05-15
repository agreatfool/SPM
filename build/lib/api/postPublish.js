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
const Database_1 = require("../Database");
const SpmPackage_1 = require("../entity/SpmPackage");
const SpmPackageVersion_1 = require("../entity/SpmPackageVersion");
const SpmPackageSecret_1 = require("../entity/SpmPackageSecret");
const ApiBase_1 = require("../ApiBase");
const lib_1 = require("../../bin/lib/lib");
class PostPublish extends ApiBase_1.ApiBase {
    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/publish';
        this.type = 'application/json; charset=utf-8';
    }
    paramsValidate(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = ctx.request.body;
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
        });
    }
    handle(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbConn = Database_1.default.instance().conn;
            const body = ctx.request.body;
            const params = body.fields;
            // find package
            const spmPackageRepo = dbConn.getRepository(SpmPackage_1.SpmPackage);
            const spmPackage = yield spmPackageRepo.findOne({ name: params.name });
            if (!spmPackage) {
                return this.buildResponse(`Package ${params.name} does not exist.`, -1);
            }
            // find package secret
            let spmPackageSecret = yield dbConn
                .getRepository(SpmPackageSecret_1.SpmPackageSecret)
                .findOne({ pid: spmPackage.id });
            if (_.isEmpty(spmPackageSecret) || spmPackageSecret.secret !== params.secret) {
                return this.buildResponse('Wrong secret', -1);
            }
            // file upload
            for (let key in params) {
                params[key] = decodeURIComponent(params[key]);
            }
            // read upload stream
            const storePath = LibPath.join(lib_1.Spm.SPM_ROOT_PATH, 'store');
            yield lib_1.mkdir(storePath);
            const fileUpload = body.files['fileUpload'];
            const fileStream = LibFs.createReadStream(fileUpload.path).on('end', () => __awaiter(this, void 0, void 0, function* () {
                yield LibFs.unlink(fileUpload.path);
            }));
            // write file stream
            const writeFilePath = LibPath.join(storePath, `${params.name}@${params.version}.zip`);
            const writeFileStream = LibFs.createWriteStream(writeFilePath);
            yield fileStream.pipe(writeFileStream);
            try {
                const [major, minor, patch] = params.version.split('.');
                // find package
                let spmPackage = yield dbConn
                    .getRepository(SpmPackage_1.SpmPackage)
                    .createQueryBuilder('package')
                    .where('package.name=:name', { name: params.name })
                    .getOne();
                // if package is not found, create package
                if (_.isEmpty(spmPackage)) {
                    let entity = new SpmPackage_1.SpmPackage();
                    entity.name = params.name;
                    entity.description = params.description;
                    spmPackage = yield dbConn.manager.save(entity);
                }
                else {
                    spmPackage.description = params.description;
                    spmPackage = yield dbConn.manager.save(spmPackage);
                }
                // find package version
                let spmPackageVersion = yield dbConn
                    .getRepository(SpmPackageVersion_1.SpmPackageVersion)
                    .createQueryBuilder('version')
                    .where('version.pid=:pid', { pid: spmPackage.id })
                    .andWhere('version.major=:major', { major: major })
                    .andWhere('version.minor=:minor', { minor: minor })
                    .andWhere('version.patch=:patch', { patch: patch })
                    .getOne();
                if (!_.isEmpty(spmPackageVersion)) {
                    return this.buildResponse(`Proto already exists! name:${params.name}, version:${params.version}`, -1);
                }
                // if version is not found, create version
                let entity = new SpmPackageVersion_1.SpmPackageVersion();
                entity.pid = spmPackage.id;
                entity.major = parseInt(major) | 0;
                entity.minor = parseInt(minor) | 0;
                entity.patch = parseInt(patch) | 0;
                entity.filePath = writeFilePath;
                entity.time = new Date().getTime();
                entity.dependencies = params.dependencies;
                yield dbConn.manager.save(entity);
                return this.buildResponse('succeed');
            }
            catch (err) {
                return this.buildResponse(err.message, -1);
            }
        });
    }
    ;
}
exports.api = new PostPublish();

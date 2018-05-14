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
const _ = require("underscore");
const Database_1 = require("../Database");
const ApiBase_1 = require("../ApiBase");
const SpmGlobalSecret_1 = require("../entity/SpmGlobalSecret");
const SpmPackage_1 = require("../entity/SpmPackage");
const SpmPackageSecret_1 = require("../entity/SpmPackageSecret");
const Const_tx_1 = require("../Const.tx");
const SpmPackageVersion_1 = require("../entity/SpmPackageVersion");
class PostDeletePackage extends ApiBase_1.ApiBase {
    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/delete_package';
        this.type = 'application/json; charset=utf-8';
    }
    paramsValidate(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = ctx.request.body;
            if (!params.packageName || _.isEmpty(params.packageName)) {
                throw new Error('PackageName is required!');
            }
            if (!params.secret || _.isEmpty(params.secret)) {
                throw new Error('Password is required!');
            }
        });
    }
    handle(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let params = ctx.request.body;
                let globalSecretEntity = yield Database_1.default.instance().conn
                    .getRepository(SpmGlobalSecret_1.SpmGlobalSecret)
                    .createQueryBuilder('g')
                    .getOne();
                if (globalSecretEntity.secret !== params.secret) {
                    return this.buildResponse(`Password error`, -1);
                }
                yield this._deletePackage(params);
                return this.buildResponse(`Delete package successfully!`, 0);
            }
            catch (err) {
                return this.buildResponse(err.message, -1);
            }
        });
    }
    ;
    _deletePackage(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let pkgRepo = Database_1.default.instance().conn.getRepository(SpmPackage_1.SpmPackage);
            let pkg = yield pkgRepo.findOne({ name: params.packageName, state: Const_tx_1.PackageState.ENABLED });
            pkg.state = Const_tx_1.PackageState.DISABLED;
            yield pkgRepo.save(pkg);
            let pkgSecretRepo = Database_1.default.instance().conn.getRepository(SpmPackageSecret_1.SpmPackageSecret);
            let pkgSecret = yield pkgSecretRepo.findOne({ name: params.packageName, state: Const_tx_1.PackageState.ENABLED });
            pkgSecret.state = Const_tx_1.PackageState.DISABLED;
            yield pkgSecretRepo.save(pkgSecret);
            let pkgVersionRepo = Database_1.default.instance().conn.getRepository(SpmPackageVersion_1.SpmPackageVersion);
            let pkgVersionList = yield pkgVersionRepo.find({ name: params.packageName, state: Const_tx_1.PackageState.ENABLED });
            for (let pkgVersion of pkgVersionList) {
                pkgVersion.state = Const_tx_1.PackageState.DISABLED;
            }
            yield pkgVersionRepo.save(pkgVersionList);
        });
    }
}
exports.api = new PostDeletePackage();

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
const Config_1 = require("../Config");
const Database_1 = require("../Database");
const SpmPackageSecret_1 = require("../entity/SpmPackageSecret");
const ApiBase_1 = require("../ApiBase");
class PostSecret extends ApiBase_1.ApiBase {
    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/secret';
        this.type = 'application/json; charset=utf-8';
    }
    paramsValidate(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = ctx.request.body;
            if (!params.name || _.isEmpty(params.name)) {
                throw new Error('Param name is required!');
            }
        });
    }
    handle(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const params = ctx.request.body;
                const dbConn = Database_1.default.instance().conn;
                // find package
                let spmPackageSecret = yield dbConn
                    .getRepository(SpmPackageSecret_1.SpmPackageSecret)
                    .createQueryBuilder('user')
                    .where('user.name=:name', { name: params.name })
                    .getOne();
                // if package is not found, create package
                if (!_.isEmpty(spmPackageSecret)) {
                    return this.buildResponse('secret already exists', -1);
                }
                let entity = new SpmPackageSecret_1.SpmPackageSecret();
                entity.name = params.name;
                entity.secret = ApiBase_1.ApiBase.genSecretToken(params.name, Config_1.default.instance().options.secret, Math.round(new Date().getTime() / 1000));
                spmPackageSecret = yield dbConn.manager.save(entity);
                return this.buildResponse({ secret: spmPackageSecret.secret });
            }
            catch (err) {
                return this.buildResponse(err.message, -1);
            }
        });
    }
    ;
}
exports.api = new PostSecret();
//# sourceMappingURL=postSecret.js.map
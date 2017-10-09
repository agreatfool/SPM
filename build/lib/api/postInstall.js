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
const LibFs = require("mz/fs");
const _ = require("underscore");
const ApiBase_1 = require("../ApiBase");
class PostInstall extends ApiBase_1.ApiBase {
    constructor() {
        super();
        this.method = 'post';
        this.uri = '/v1/install';
        this.type = 'application/json; charset=utf-8';
    }
    paramsValidate(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = ctx.request.body;
            if (!params.path || _.isEmpty(params.path)) {
                throw new Error('path is required!');
            }
        });
    }
    handle(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const params = ctx.request.body;
                if (LibFs.statSync(params.path).isFile()) {
                    ctx.set('Content-Disposition', `attachment; filename='tmp.zip'`);
                    return LibFs.createReadStream(params.path);
                }
                else {
                    return this.buildResponse('Package file not found, path: ' + params.path, -1);
                }
            }
            catch (err) {
                return this.buildResponse(err.message, -1);
            }
        });
    }
    ;
}
exports.api = new PostInstall();

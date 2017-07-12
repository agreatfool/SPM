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
class PostInstall {
    constructor() {
        this.method = 'post';
        this.uri = '/v1/install';
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
                    let res = {};
                    res.code = -1;
                    res.msg = err.message;
                    ctx.body = res;
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
            const params = ctx.request.body;
            if (!params.path || _.isEmpty(params.path)) {
                throw new Error("path is required!");
            }
        });
    }
    handle(ctx, next, conn) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = {};
            try {
                const params = ctx.request.body;
                let fileStat = yield LibFs.stat(params.path);
                if (fileStat.isFile()) {
                    ctx.set('Content-Disposition', `attachment; filename="tmp.zip"`);
                    return LibFs.createReadStream(params.path);
                }
                else {
                    res.code = -1;
                    res.msg = "Package file not found, path: " + params.path;
                }
                return res;
            }
            catch (err) {
                res.code = -1;
                res.msg = err.message;
            }
            return res;
        });
    }
    ;
}
exports.api = new PostInstall();
//# sourceMappingURL=postInstall.js.map
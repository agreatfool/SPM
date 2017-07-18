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
class ApiBase {
    register() {
        return [this.uri, this._validate(), this._execute()];
    }
    ;
    _validate() {
        return (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.paramsValidate(ctx);
                yield next();
            }
            catch (err) {
                ctx.body = this.buildResponse(err.message, -1);
            }
        });
    }
    _execute() {
        return (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            ctx.body = yield this.handle(ctx, next);
            yield next();
        });
    }
    buildResponse(msg, code = 0) {
        if (code < 0) {
            console.log(`[${this.uri}]: ${msg}`);
        }
        return {
            code: code,
            msg: msg
        };
    }
    static genSecretToken(key1, key2, time) {
        return require('md5')(key1 + key2 + time.toString()).substr(0, 8);
    }
}
exports.ApiBase = ApiBase;
//# sourceMappingURL=ApiBase.js.map
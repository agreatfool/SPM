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
    register(options, dbHandler) {
        this.options = options;
        this.dbHandler = dbHandler;
        return [this.uri, this._validate(), this._execute()];
    }
    ;
    _validate() {
        let _this = this;
        return function (ctx, next) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    yield _this.paramsValidate(ctx);
                    yield next();
                }
                catch (err) {
                    ctx.body = _this.buildResponse(err.message, -1);
                }
            });
        };
    }
    _execute() {
        let _this = this;
        return function (ctx, next) {
            return __awaiter(this, void 0, void 0, function* () {
                ctx.body = yield _this.handle(ctx, next);
                yield next();
            });
        };
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
}
exports.ApiBase = ApiBase;
//# sourceMappingURL=ApiBase.js.map
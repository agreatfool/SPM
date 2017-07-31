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
const Koa = require("koa");
const koaBody = require("koa-body");
const koaBodyParser = require("koa-bodyparser");
const Config_1 = require("./Config");
const Database_1 = require("./Database");
const Router_1 = require("./Router");
class App {
    constructor() {
        this._app = new Koa();
        this._initialized = false;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Config_1.default.instance().init();
            yield Database_1.default.instance().init();
            yield Router_1.default.instance().init();
            this._app.use(koaBody({ multipart: true }));
            this._app.use(koaBodyParser({ formLimit: '2048kb' })); // post body parser
            this._app.use(Router_1.default.instance().getRouter().routes());
            this._initialized = true;
        });
    }
    start() {
        if (!this._initialized) {
            console.log(`SPM Server start failed!`);
            return;
        }
        // server start
        let options = Config_1.default.instance().options;
        this._app.listen(options.port, options.host, () => {
            console.log(`SPM Server start! ${options.host}:${options.port}`);
        });
    }
}
exports.default = App;
//# sourceMappingURL=App.js.map
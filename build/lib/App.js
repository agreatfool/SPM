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
// import * as koaBodyParser from "koa-bodyparser";
const Config_1 = require("./Config");
const Database_1 = require("./Database");
const Router_1 = require("./Router");
class App {
    constructor() {
        this.app = new Koa();
        this.config = Config_1.default.instance();
        this.database = Database_1.default.instance();
        this.router = Router_1.default.instance();
        this._initialized = false;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.config.init();
            yield this.database.init();
            yield this.router.init(this.config.options, this.database.conn);
            this.app.use(koaBody({ multipart: true }));
            this.app.use(Router_1.default.instance().getRouter().routes());
            this._initialized = true;
        });
    }
    start() {
        if (!this._initialized) {
            return;
        }
        // server start
        this.app.listen(this.config.options.port, this.config.options.host, () => {
            console.log(`SPM Server start! ${this.config.options.host}:${this.config.options.port}`);
        });
    }
}
exports.default = App;
//# sourceMappingURL=App.js.map
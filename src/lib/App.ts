import * as Koa from "koa";
import * as koaBody from "koa-body";
import * as koaBodyParser from "koa-bodyparser";
import Config from "./Config";
import Database from "./Database";
import Router from "./Router";

export default class App {
    private _initialized: boolean;
    private _app: Koa;

    constructor() {
        this._app = new Koa();
        this._initialized = false;
    }

    public async init(): Promise<any> {
        await Config.instance().init();
        await Database.instance().init();
        await Router.instance().init();

        this._app.use(koaBody({multipart: true}));
        this._app.use(koaBodyParser({formLimit: '2048kb'})); // post body parser
        this._app.use(Router.instance().getRouter().routes());
        this._initialized = true;
    }

    public start(): void {
        if (!this._initialized) {
            console.log(`SPM Server start failed!`);
            return;
        }

        // server start
        let options = Config.instance().options;
        this._app.listen(options.port, options.host, () => {
            console.log(`SPM Server start! ${options.host}:${options.port}`);
        });
    }
}
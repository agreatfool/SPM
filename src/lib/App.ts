import * as Koa from "koa";
import * as koaBody from "koa-body";
// import * as koaBodyParser from "koa-bodyparser";
import Config from "./Config";
import Database from "./Database";
import Router from "./Router";

export default class App {
    private _initialized: boolean;
    public app: Koa;
    public config: Config;
    public database: Database;
    public router: Router;

    constructor() {
        this.app = new Koa();
        this.config = Config.instance();
        this.database = Database.instance();
        this.router = Router.instance();
        this._initialized = false;
    }

    public async init(): Promise<any> {
        await this.config.init();
        await this.database.init();
        await this.router.init(this.config.options, this.database.conn);

        this.app.use(koaBody({ multipart: true }));
        this.app.use(Router.instance().getRouter().routes());
        this._initialized = true;
    }

    public start(): void {
        if (!this._initialized) {
            return;
        }

        // server start
        this.app.listen(this.config.options.port, this.config.options.host, () => {
            console.log(`SPM Server start! ${this.config.options.host}:${this.config.options.port}`);
        });
    }
}
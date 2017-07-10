import * as Router from "koa-router";
import * as LibPath from 'path';
import * as LibFs from 'mz/fs';
import {ConfigOptions} from "./Config";
import {Connection} from "typeorm";

export interface ResponseSchema {
    code: number,
    msg: string | object
}
export type MiddlewareNext = () => Promise<any>

export default class RouteLoader {
    private static _instance: RouteLoader;

    private _initialized: boolean;
    private _router: Router;

    private constructor() {
        this._initialized = false;
        this._router = new Router();
    }

    public static instance(): RouteLoader {
        if (RouteLoader._instance === undefined) {
            RouteLoader._instance = new RouteLoader();
        }
        return RouteLoader._instance;
    }

    public async init(options: ConfigOptions, conn: Connection) {
        let _this = this;
        let dir = LibPath.join(__dirname, "api");
        let files = await LibFs.readdir(dir);

        for (let file of files) {
            if (LibPath.basename(file).match(/.+\.js$/) !== null) {
                await _this._createRouter(LibPath.join(dir, file), options, conn)
            }
        }

        this._initialized = true;
    }

    public getRouter(): Router {
        return this._router;
    }

    private async _createRouter(path: string, options: ConfigOptions, conn: Connection): Promise<void> {
        try {
            let api = require(path).api;
            this._router[api.method].apply(this._router, api.register(options, conn));
        } catch (err) {
            console.error(err.toString());
        }
    }
}
import * as LibPath from "path";
import * as LibFs from "mz/fs";

export interface ConfigOptions {
    host: string;
    port: number;
    secret: string;
}

export default class Config {

    private static _instance: Config;

    private _initialized: boolean;
    private _options: ConfigOptions;

    public static instance(): Config {
        if (Config._instance === undefined) {
            Config._instance = new Config();
        }
        return Config._instance;
    }

    private constructor() {
        this._initialized = false;
    }

    public get options(): ConfigOptions {
        return this._options;
    }

    public async init() {
        let filePath = LibPath.join(__dirname, '..', '..', 'config', 'config.json');
        let stats = await LibFs.stat(filePath);
        if (stats.isFile()) {
            try {
                this._options = JSON.parse(LibFs.readFileSync(filePath).toString());
                this._initialized = true;
            } catch (e) {
                throw new Error('[Config] Error:' + e.message);
            }
        } else {
            throw new Error('[Config] config file path have to be an absolute path!');
        }
    }
}

import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as http from "http";

export enum RequestMethod { post, get }

export interface SpmConfig {
    host: string;
    port: number;
    secret: string;
}

export interface SpmPackageOption {
    name: string;
    version: string;
    dependencies?: {
        [key: string]: string;
    };
}

export interface SpmPackageInstalled {
    name: string;
    version: [string, string, string];
    path: string;
    dependencies?: {
        [key: string]: string;
    };
    dependenciesChangeMap?: {
        [key: string]: string;
    };
}

export const rmdir = async (dirPath) => {
    let files = await LibFs.readdir(dirPath);
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            let filePath = LibPath.join(dirPath, files[i]);
            let fileStat = await LibFs.stat(filePath);
            if (fileStat.isFile()) {
                await LibFs.unlink(filePath);
            } else {
                await rmdir(filePath);
            }
        }
    }
    await LibFs.rmdir(dirPath);
};

const buildParam = (condition) => {
    let data = null;
    if (condition != null) {
        if (typeof condition == 'string') {
            data = condition;
        }
        if (typeof condition == 'object') {
            let arr = [];
            for (let name in condition) {
                if (!condition.hasOwnProperty(name)) {
                    continue;
                }
                let value = condition[name];
                arr.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
            }
            data = arr.join('&');
        }
    }
    return data;
};

export const findProjectDir = (path: string): string => {
    const pkg = require('../../../package.json');
    if (path.indexOf('node_modules') >= 0) {
        return LibPath.join(path.substr(0, path.indexOf('node_modules')));
    }

    if (path.indexOf(pkg.name) >= 0) {
        return LibPath.join(__dirname.substr(0, __dirname.indexOf(pkg.name)), '..');
    }

    return LibPath.join(path, '..', '..', '..', '..')
};

export interface ProtoDependencies {
    name: string,
    version: string,
    dependencies: {
        [key: string]: string
    }
}

export interface ProtoDependenciesList {
    [key: string]: ProtoDependencies;
}

export namespace SpmHttp {

    /**
     * Get Spm http config
     *
     * @returns {Promise<SpmConfig>}
     */
    export async function getConfig(): Promise<SpmConfig> {
        let filePath = LibPath.join(__dirname, "..", "..", "..", 'config', "config.json");
        let stats = await LibFs.stat(filePath);
        if (stats.isFile()) {
            try {
                return JSON.parse(LibFs.readFileSync(filePath).toString());
            } catch (e) {
                throw new Error('[Config] Error:' + e.message);
            }
        } else {
            throw new Error('[Config] config file path have to be an absolute path!');
        }
    }

    /**
     * Get Spm Publish request config
     *
     * @returns {Promise<SpmConfig>}
     */
    export async function getRequestOption(path: string, method: RequestMethod = RequestMethod.get) : Promise<http.RequestOptions> {
        let spmHttpConfig = await SpmHttp.getConfig();

        let requestConfig = {} as http.RequestOptions;
        requestConfig.host = spmHttpConfig.host;
        requestConfig.port = spmHttpConfig.port;
        requestConfig.method = RequestMethod[method];
        requestConfig.path = path;

        return requestConfig;
    }
}

export namespace SpmSecret {

    export const SPM_LRC_PATH: string = LibPath.join(__dirname, "..", "..", "..", ".spmlrc");

    /**
     * Save secret value into .spmlrc
     *
     * @returns {void}
     */
    export function save(value): void {
        LibFs.writeFileSync(SpmSecret.SPM_LRC_PATH, value, "utf-8")
    }

    /**
     * Load secret value from .spmlrc
     *
     * @returns {string}
     */
    export function load(): string {
        return LibFs.readFileSync(SpmSecret.SPM_LRC_PATH).toString()
    }
}
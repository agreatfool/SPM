import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as LibMkdirP from "mkdirp";
import * as bluebird from "bluebird";
import * as request from 'request';
import * as recursive from "recursive-readdir";
import {ResponseSchema} from "../../lib/ApiBase";

export enum RequestMethod { post, get }

export interface SpmConfig {
    host: string;
    port: number;
    secret: string;
    remote_repo: string;
}

export interface SpmPackageConfig {
    name: string;
    version: string;
    description?: string;
    dependencies?: {
        [key: string]: string;
    };
}

export interface SpmPackage extends SpmPackageConfig {
    dependenciesChanged?: {
        [key: string]: string;
    };
    downloadUrl?: string;
    isDependencies?: boolean;
}

export interface SpmPackageMap {
    [dirname: string]: SpmPackage;
}

export const mkdir = bluebird.promisify<string>(LibMkdirP) as {
    <T>(path: string): bluebird<T>;
};

export const rmdir = (dirPath: string) => {
    let files = LibFs.readdirSync(dirPath);
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            let filePath = LibPath.join(dirPath, files[i]);
            if (LibFs.statSync(filePath).isFile()) {
                LibFs.unlinkSync(filePath);
            } else {
                rmdir(filePath);
            }
        }
    }
    LibFs.rmdirSync(dirPath);
};

export namespace Spm {

    export const INSTALL_DIR_NAME: string = 'spm_protos';
    export const SPM_VERSION_CONNECTOR: string = '__v';
    export const SPM_ROOT_PATH: string = LibPath.join(__dirname, '..', '..', '..');

    /**
     * Find project dir
     *
     * @returns {string}
     */
    export function getProjectDir(): string {
        return process.cwd();
    }

    /**
     * Save secret value into .spmlrc
     *
     * @returns {void}
     */
    export function saveSecret(value: string) {
        let lrcPath = LibPath.join(Spm.getProjectDir(), '.spmlrc');
        LibFs.writeFileSync(lrcPath, value, 'utf-8');
    }

    /**
     * Load secret value from .spmlrc
     *
     * @returns {string}
     */
    export function loadSecret(): string {
        let lrcPath = LibPath.join(Spm.getProjectDir(), '.spmlrc');
        if (LibFs.existsSync(lrcPath) && LibFs.statSync(lrcPath).isFile()) {
            return LibFs.readFileSync(lrcPath).toString();
        } else {
            return '';
        }
    }

    /**
     * Get Spm config
     *
     * @returns {SpmConfig}
     */
    export function getConfig(path?: string): SpmConfig {
        let configPath = (path) ? path : LibPath.join(SPM_ROOT_PATH, 'config', 'config.json');
        if (LibFs.existsSync(configPath) && LibFs.statSync(configPath).isFile()) {
            return JSON.parse(LibFs.readFileSync(configPath).toString());
        } else {
            throw new Error('[Config] config file path have to be an absolute path!');
        }
    }

    /**
     * Read spm.json via config path
     *
     * @param {string} path
     * @returns {SpmPackageConfig}
     */
    export function getSpmPackageConfig(path: string): SpmPackageConfig {
        return JSON.parse(LibFs.readFileSync(path).toString());
    }

    /**
     * Get all installed SpmPackage from projectDir
     *
     * @returns {Promise<SpmPackageMap>}
     */
    export async function getInstalledSpmPackageMap(path?: string): Promise<SpmPackageMap> {
        const projectDir = path ? path : Spm.getProjectDir();
        const installDir = LibPath.join(projectDir, Spm.INSTALL_DIR_NAME);

        if (LibFs.existsSync(installDir) && LibFs.statSync(installDir).isDirectory()) {
            const files = await recursive(installDir, ['.DS_Store']);
            let spmPackageMap = {} as SpmPackageMap;
            for (let file of files) {
                const basename = LibPath.basename(file);
                if (basename.match(/.+\.json/) !== null) {
                    const dirname = LibPath.dirname(file).replace(installDir, '').replace('\\', '').replace('/', '');
                    const packageConfig = Spm.getSpmPackageConfig(file);
                    spmPackageMap[dirname] = {
                        name: packageConfig.name,
                        version: packageConfig.version,
                        dependencies: packageConfig.dependencies
                    };
                }
            }
            return spmPackageMap;
        } else {
            return {};
        }
    }

    /**
     * Replace string in file
     *
     * @param {string} filePath
     * @param {Array<[RegExp, any]>} conditions
     * @returns {Promise<void>}
     */
    export async function replaceStringInFile(filePath: string, conditions: Array<[RegExp, any]>): Promise<void> {
        try {
            let buffer = await LibFs.readFile(filePath);
            let content = buffer.toString();
            for (let [reg, word] of conditions) {
                content = content.replace(reg, word);
            }
            await LibFs.writeFile(filePath, Buffer.from(content));
        } catch (e) {
            throw e;
        }
    }
}

export namespace SpmPackageRequest {
    /**
     * Parse request response
     *
     * @param {string} chunk
     * @returns {any}
     */
    export function parseResponse(chunk: Buffer | string): any {
        let response = JSON.parse(chunk.toString()) as ResponseSchema;
        if (response.code < 0) {
            throw new Error(response.msg.toString());
        }
        return response.msg;
    }
}

export namespace HttpRequest {
    export async function post(uri: string, params: {[key: string]: any}): Promise<any> {
        return new Promise((resolve, reject) => {
            request.post(`${Spm.getConfig().remote_repo}${uri}`)
                .form(params)
                .on('response', (response) => {
                    response.on('data', (chunk) => {
                        try {
                            resolve(SpmPackageRequest.parseResponse(chunk));
                        } catch (e) {
                            reject(e);
                        }
                    });
                })
                .on('error', (e) => {
                    reject(e);
                });
        });
    }
}
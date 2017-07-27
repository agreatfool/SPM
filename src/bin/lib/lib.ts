import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as LibMkdirP from "mkdirp";
import * as bluebird from "bluebird";
import * as http from "http";
import * as recursive from "recursive-readdir";
import {ResponseSchema} from "../../lib/ApiBase";

export enum RequestMethod { post, get }

export interface SpmConfig {
    host: string;
    port: number;
    secret: string;
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
    <T>(path: string): bluebird<T>
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
        let projectDir = path ? path : Spm.getProjectDir();
        let installDir = LibPath.join(projectDir, Spm.INSTALL_DIR_NAME);

        if (LibFs.existsSync(installDir) && LibFs.statSync(installDir).isDirectory()) {
            let files = await recursive(installDir, ['.DS_Store']);

            let spmPackageMap = {} as SpmPackageMap;
            for (let file of files) {
                let basename = LibPath.basename(file);
                if (basename.match(/.+\.json/) !== null) {
                    let dirname = LibPath.dirname(file).replace(installDir, '').replace('\\', '').replace('/', '');
                    let packageConfig = Spm.getSpmPackageConfig(file);
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
    export async function replaceStringInFile(filePath: string, conditions: Array<[RegExp, any]>) {
        try {
            let buffer = await LibFs.readFile(filePath);
            let content = buffer.toString();
            for (let [reg, word] of conditions) {
                content = content.replace(reg, word);
            }
            LibFs.writeFileSync(filePath, Buffer.from(content));
        } catch (e) {
            throw e;
        }
    }
}

export namespace SpmPackageRequest {
    /**
     * Get Spm Publish request config
     *
     * @returns {SpmConfig}
     */
    export function getRequestOption(path: string, method: RequestMethod = RequestMethod.get): http.RequestOptions {
        let spmHttpConfig = Spm.getConfig();
        return {
            host: spmHttpConfig.host,
            port: spmHttpConfig.port,
            method: RequestMethod[method],
            path: path,
        };
    }

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
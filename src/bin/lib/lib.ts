import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as LibMkdirP from "mkdirp";
import * as bluebird from "bluebird";
import * as http from "http";
import * as qs from "querystring";
import * as recursive from "recursive-readdir";
import {ResponseSchema} from "../../lib/ApiBase";
import {error} from "util";

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
        if (LibFs.statSync(lrcPath).isFile()) {
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
    export function getConfig(): SpmConfig {
        let configPath = LibPath.join(SPM_ROOT_PATH, 'config', 'config.json');
        if (LibFs.statSync(configPath).isFile()) {
            return JSON.parse(LibFs.readFileSync(configPath).toString());
        } else {
            throw new Error('[Config] config file path have to be an absolute path!');
        }
    }

    /**
     * Find project dir
     *
     * @returns {string}
     */
    export function getProjectDir(): string {
        return process.cwd();
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
    export async function getInstalledSpmPackageMap(): Promise<SpmPackageMap> {
        let projectDir = Spm.getProjectDir();
        let installDir = LibPath.join(projectDir, Spm.INSTALL_DIR_NAME);

        let spmPackageMap = {} as SpmPackageMap;
        if (LibFs.statSync(installDir).isDirectory()) {
            let files = await recursive(installDir, ['.DS_Store']);

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
        }
        return spmPackageMap;
    }

    /**
     * Replace string in file
     *
     * @param {string} filePath
     * @param {Array<[RegExp, any]>} conditions
     * @returns {Promise<void>}
     */
    export function replaceStringInFile(filePath: string, conditions: Array<[RegExp, any]>) {
        try {
            if (LibFs.statSync(filePath).isFile()) {
                let content = LibFs.readFileSync(filePath).toString();
                for (let [reg, word] of conditions) {
                    content = content.toString().replace(reg, word);
                }
                LibFs.writeFileSync(filePath, Buffer.from(content), (err) => {
                    if (err) {
                        throw err;
                    }
                });
            }
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

    export function postRequest(uri: string, params: Object, callback: (chunk: Buffer | string, resolve: any, reject: any) => void, handleResponse?: Function) {

        return new Promise((resolve, reject) => {
            // create request
            let reqOptions = SpmPackageRequest.getRequestOption(uri, RequestMethod.post);

            let req = http.request(reqOptions, (res) => {
                (handleResponse)
                    ? handleResponse(res, resolve)
                    : res.on('data', (chunk) => callback(chunk, resolve, reject));
            }).on('error', (e) => {
                reject(e);
            });

            // send content
            let reqParamsStr = qs.stringify(params);
            req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
            req.write(reqParamsStr);
        });
    }

    export function postFormRequest(uri: string, params: Object, filePath: Array<string>, callback: (chunk: Buffer | string, resolve: any, reject: any) => void) {
        return new Promise((resolve, reject) => {
            // create request
            let reqOptions = SpmPackageRequest.getRequestOption(uri, RequestMethod.post);
            let req = http.request(reqOptions, (res) => {
                res.on('data', (chunk) => callback(chunk, resolve, reject));
            }).on('error', (e) => {
                reject(e);
            });

            // send content
            let boundaryKey = Math.random().toString(16);
            let enddata = '\r\n----' + boundaryKey + '--';

            // build form params head
            let content = '';
            for (let key in params) {
                content += '\r\n----' + boundaryKey + '\r\n'
                    + 'Content-Disposition: form-data; name="' + key + '" \r\n\r\n'
                    + encodeURIComponent(params[key]);
            }

            let contentBinary = new Buffer(content, 'utf-8');
            let contentLength = contentBinary.length;

            // build upload file head
            if (filePath.length > 0) {
                content += '\r\n----' + boundaryKey + '\r\n'
                    + 'Content-Type: application/octet-stream\r\n'
                    + 'Content-Disposition: form-data; name="fileUpload"; filename="' + `${Math.random().toString(16)}.zip` + '"\r\n'
                    + "Content-Transfer-Encoding: binary\r\n\r\n";
                contentBinary = new Buffer(content, 'utf-8');
                contentLength = LibFs.statSync(filePath[0]).size + contentBinary.length;

                // send request stream
                let fileStream = LibFs.createReadStream(filePath[0]);
                fileStream.on('end', () => {
                    req.end(enddata);
                });
                fileStream.pipe(req, {end: false});
            }

            // send request headers
            req.setHeader('Content-Type', 'multipart/form-data; boundary=--' + boundaryKey);
            req.setHeader('Content-Length', `${contentLength + Buffer.byteLength(enddata)}`);
            req.write(contentBinary);

            if (filePath.length === 0) {
                req.end(enddata);
            }
        });
    }

    export function parseResponse(chunk): any {
        let response = JSON.parse(chunk) as ResponseSchema;

        if (response.code < 0) {
            throw new Error(response.msg.toString());
        }

        return response.msg;
    }
}
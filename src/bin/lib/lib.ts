import * as LibPath from "path";
import * as LibFs from "mz/fs";
import * as http from "http";
import * as _ from "underscore";
import {ClientRequest} from "http";

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
        [key: string]: string
    }
}

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
    export async function getRequestOption(path: string, params: {[key: string]: string}, method: RequestMethod = RequestMethod.get) : Promise<http.RequestOptions> {
        let spmHttpConfig = await SpmHttp.getConfig();
        let spmSecretValue = await SpmSecret.load();

        let requestConfig = {} as http.RequestOptions;
        requestConfig.host = spmHttpConfig.host;
        requestConfig.port = spmHttpConfig.port;
        requestConfig.method = RequestMethod[method];
        requestConfig.path = (_.isEmpty(params)) ? path + "?secret=" + spmSecretValue : path + "?secret=" + spmSecretValue + "&" + buildParam(params);
        return requestConfig;
    }

    export async function uploadFiles(filePath: string, fileInfo: SpmPackageOption, req: ClientRequest) {
        let boundaryKey = Math.random().toString(16);
        let enddata = '\r\n----' + boundaryKey + '--';
        let content = '\r\n----' + boundaryKey + '\r\n'
            + 'Content-Type: application/octet-stream\r\n'
            + 'Content-Disposition: form-data; name="fileUpload"; filename="' + `${fileInfo.name}@${fileInfo.version}.zip` + '"\r\n'
            + "Content-Transfer-Encoding: binary\r\n\r\n";
        let contentBinary = new Buffer(content, 'utf-8');
        let contentLength = LibFs.statSync(filePath).size + contentBinary.length;

        // write headers
        req.setHeader('Content-Type', 'multipart/form-data; boundary=--' + boundaryKey);
        req.setHeader('Content-Length', `${contentLength + Buffer.byteLength(enddata)}`);
        req.write(contentBinary);

        // send stream
        let fileStream = LibFs.createReadStream(filePath);
        fileStream.pipe(req, { end: false });
        fileStream.on('end', function() {
            req.end(enddata);
        });
        req.end(enddata);
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
    export async function load(): Promise<string> {
        return await LibFs.readFileSync(SpmSecret.SPM_LRC_PATH).toString()
    }
}
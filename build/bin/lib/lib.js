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
const LibPath = require("path");
const LibFs = require("mz/fs");
const LibMkdirP = require("mkdirp");
const bluebird = require("bluebird");
const http = require("http");
const qs = require("querystring");
const recursive = require("recursive-readdir");
var RequestMethod;
(function (RequestMethod) {
    RequestMethod[RequestMethod["post"] = 0] = "post";
    RequestMethod[RequestMethod["get"] = 1] = "get";
})(RequestMethod = exports.RequestMethod || (exports.RequestMethod = {}));
exports.mkdir = bluebird.promisify(LibMkdirP);
exports.rmdir = (dirPath) => {
    let files = LibFs.readdirSync(dirPath);
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            let filePath = LibPath.join(dirPath, files[i]);
            if (LibFs.statSync(filePath).isFile()) {
                LibFs.unlinkSync(filePath);
            }
            else {
                exports.rmdir(filePath);
            }
        }
    }
    LibFs.rmdirSync(dirPath);
};
var Spm;
(function (Spm) {
    Spm.INSTALL_DIR_NAME = 'spm_protos';
    Spm.SPM_VERSION_CONNECTOR = '__v';
    Spm.SPM_ROOT_PATH = LibPath.join(__dirname, '..', '..', '..');
    /**
     * Save secret value into .spmlrc
     *
     * @returns {void}
     */
    function saveSecret(value) {
        let lrcPath = LibPath.join(Spm.getProjectDir(), '.spmlrc');
        LibFs.writeFileSync(lrcPath, value, 'utf-8');
    }
    Spm.saveSecret = saveSecret;
    /**
     * Load secret value from .spmlrc
     *
     * @returns {string}
     */
    function loadSecret() {
        let lrcPath = LibPath.join(Spm.getProjectDir(), '.spmlrc');
        if (LibFs.statSync(lrcPath).isFile()) {
            return LibFs.readFileSync(lrcPath).toString();
        }
        else {
            return '';
        }
    }
    Spm.loadSecret = loadSecret;
    /**
     * Get Spm config
     *
     * @returns {SpmConfig}
     */
    function getConfig() {
        let configPath = LibPath.join(Spm.SPM_ROOT_PATH, 'config', 'config.json');
        if (LibFs.statSync(configPath).isFile()) {
            return JSON.parse(LibFs.readFileSync(configPath).toString());
        }
        else {
            throw new Error('[Config] config file path have to be an absolute path!');
        }
    }
    Spm.getConfig = getConfig;
    /**
     * Find project dir
     *
     * @returns {string}
     */
    function getProjectDir() {
        return process.cwd();
    }
    Spm.getProjectDir = getProjectDir;
    /**
     * Read spm.json via config path
     *
     * @param {string} path
     * @returns {SpmPackageConfig}
     */
    function getSpmPackageConfig(path) {
        return JSON.parse(LibFs.readFileSync(path).toString());
    }
    Spm.getSpmPackageConfig = getSpmPackageConfig;
    /**
     * Get all installed SpmPackage from projectDir
     *
     * @returns {Promise<SpmPackageMap>}
     */
    function getInstalledSpmPackageMap() {
        return __awaiter(this, void 0, void 0, function* () {
            let projectDir = Spm.getProjectDir();
            let installDir = LibPath.join(projectDir, Spm.INSTALL_DIR_NAME);
            let spmPackageMap = {};
            if (LibFs.statSync(installDir).isDirectory()) {
                let files = yield recursive(installDir, ['.DS_Store']);
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
        });
    }
    Spm.getInstalledSpmPackageMap = getInstalledSpmPackageMap;
    /**
     * Replace string in file
     *
     * @param {string} filePath
     * @param {Array<[RegExp, any]>} conditions
     * @returns {Promise<void>}
     */
    function replaceStringInFile(filePath, conditions) {
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
        }
        catch (e) {
            throw e;
        }
    }
    Spm.replaceStringInFile = replaceStringInFile;
})(Spm = exports.Spm || (exports.Spm = {}));
var SpmPackageRequest;
(function (SpmPackageRequest) {
    /**
     * Get Spm Publish request config
     *
     * @returns {SpmConfig}
     */
    function getRequestOption(path, method = RequestMethod.get) {
        let spmHttpConfig = Spm.getConfig();
        return {
            host: spmHttpConfig.host,
            port: spmHttpConfig.port,
            method: RequestMethod[method],
            path: path,
        };
    }
    SpmPackageRequest.getRequestOption = getRequestOption;
    function postRequest(uri, params, callback, handleResponse) {
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
    SpmPackageRequest.postRequest = postRequest;
    function postFormRequest(uri, params, filePath, callback) {
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
                fileStream.pipe(req, { end: false });
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
    SpmPackageRequest.postFormRequest = postFormRequest;
    function parseResponse(chunk) {
        let response = JSON.parse(chunk);
        if (response.code < 0) {
            throw new Error(response.msg.toString());
        }
        return response.msg;
    }
    SpmPackageRequest.parseResponse = parseResponse;
})(SpmPackageRequest = exports.SpmPackageRequest || (exports.SpmPackageRequest = {}));
//# sourceMappingURL=lib.js.map
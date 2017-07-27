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
const recursive = require("recursive-readdir");
const request = require("./request");
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
     * Find project dir
     *
     * @returns {string}
     */
    function getProjectDir() {
        return process.cwd();
    }
    Spm.getProjectDir = getProjectDir;
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
        if (LibFs.existsSync(lrcPath) && LibFs.statSync(lrcPath).isFile()) {
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
    function getConfig(path) {
        let configPath = (path) ? path : LibPath.join(Spm.SPM_ROOT_PATH, 'config', 'config.json');
        if (LibFs.existsSync(configPath) && LibFs.statSync(configPath).isFile()) {
            return JSON.parse(LibFs.readFileSync(configPath).toString());
        }
        else {
            throw new Error('[Config] config file path have to be an absolute path!');
        }
    }
    Spm.getConfig = getConfig;
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
    function getInstalledSpmPackageMap(path) {
        return __awaiter(this, void 0, void 0, function* () {
            let projectDir = path ? path : Spm.getProjectDir();
            let installDir = LibPath.join(projectDir, Spm.INSTALL_DIR_NAME);
            if (LibFs.existsSync(installDir) && LibFs.statSync(installDir).isDirectory()) {
                let files = yield recursive(installDir, ['.DS_Store']);
                let spmPackageMap = {};
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
            }
            else {
                return {};
            }
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
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let buffer = yield LibFs.readFile(filePath);
                let content = buffer.toString();
                for (let [reg, word] of conditions) {
                    content = content.replace(reg, word);
                }
                LibFs.writeFileSync(filePath, Buffer.from(content));
            }
            catch (e) {
                throw e;
            }
        });
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
    function parseResponse(chunk) {
        let response = JSON.parse(chunk);
        if (response.code < 0) {
            throw new Error(response.msg.toString());
        }
        return response.msg;
    }
    SpmPackageRequest.parseResponse = parseResponse;
    function postRequest(uri, params, callback, fileStream) {
        return new Promise((resolve, reject) => {
            request.fetch(params, SpmPackageRequest.getRequestOption(uri, RequestMethod.post))
                .then((res) => {
                if (res.headers['content-type'] == 'application/octet-stream') {
                    res.pipe(fileStream);
                    res.on('end', () => callback("finish", resolve, reject));
                }
                else {
                    let chunk = '';
                    res.on('data', _chunk => (chunk += _chunk));
                    res.on('end', () => callback(chunk, resolve, reject));
                }
                // (handleResponse)
                //     ? handleResponse(res, resolve)
                //     : res.on('data', (chunk) => callback(chunk, resolve, reject));
            })
                .catch((e) => reject(e));
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
})(SpmPackageRequest = exports.SpmPackageRequest || (exports.SpmPackageRequest = {}));
//# sourceMappingURL=lib.js.map
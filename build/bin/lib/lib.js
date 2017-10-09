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
const request = require("request");
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
            const projectDir = path ? path : Spm.getProjectDir();
            const installDir = LibPath.join(projectDir, Spm.INSTALL_DIR_NAME);
            if (LibFs.existsSync(installDir) && LibFs.statSync(installDir).isDirectory()) {
                const files = yield recursive(installDir, ['.DS_Store']);
                let spmPackageMap = {};
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
                yield LibFs.writeFile(filePath, Buffer.from(content));
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
     * Parse request response
     *
     * @param {string} chunk
     * @returns {any}
     */
    function parseResponse(chunk) {
        let response = JSON.parse(chunk.toString());
        if (response.code < 0) {
            throw new Error(response.msg.toString());
        }
        return response.msg;
    }
    SpmPackageRequest.parseResponse = parseResponse;
})(SpmPackageRequest = exports.SpmPackageRequest || (exports.SpmPackageRequest = {}));
var HttpRequest;
(function (HttpRequest) {
    function post(uri, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                request.post(`${Spm.getConfig().remote_repo}${uri}`)
                    .form(params)
                    .on('response', (response) => {
                    response.on('data', (chunk) => {
                        try {
                            resolve(SpmPackageRequest.parseResponse(chunk));
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                })
                    .on('error', (e) => {
                    reject(e);
                });
            });
        });
    }
    HttpRequest.post = post;
    function download(uri, params, filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                request.post(`${Spm.getConfig().remote_repo}${uri}`)
                    .form(params)
                    .on('response', (response) => {
                    // 当返回结果的 header 类型不是 ‘application/octet-stream’，则返回报错信息
                    if (response.headers['content-type'] == 'application/octet-stream') {
                        response.on('end', () => {
                            resolve();
                        });
                    }
                    else {
                        response.on('data', (chunk) => {
                            reject(new Error(chunk.toString()));
                        });
                    }
                })
                    .on('error', (e) => {
                    reject(e);
                })
                    .pipe(LibFs.createWriteStream(filePath));
            });
        });
    }
    HttpRequest.download = download;
    function upload(uri, params, fileUploadStream) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let req = request.post(`${Spm.getConfig().remote_repo}${uri}`, (e, response) => {
                    if (e) {
                        reject(e);
                    }
                    console.log(`PublishCLI publish: [Response] - ${response.body}`);
                    resolve();
                });
                let form = req.form();
                for (let key in params) {
                    form.append(key, params[key]);
                }
                form.append('fileUpload', fileUploadStream, { filename: `${Math.random().toString(16)}.zip` });
            });
        });
    }
    HttpRequest.upload = upload;
})(HttpRequest = exports.HttpRequest || (exports.HttpRequest = {}));

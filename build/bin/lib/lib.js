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
const _ = require("underscore");
var RequestMethod;
(function (RequestMethod) {
    RequestMethod[RequestMethod["post"] = 0] = "post";
    RequestMethod[RequestMethod["get"] = 1] = "get";
})(RequestMethod = exports.RequestMethod || (exports.RequestMethod = {}));
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
var SpmHttp;
(function (SpmHttp) {
    /**
     * Get Spm http config
     *
     * @returns {Promise<SpmConfig>}
     */
    function getConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            let filePath = LibPath.join(__dirname, "..", "..", "..", 'config', "config.json");
            let stats = yield LibFs.stat(filePath);
            if (stats.isFile()) {
                try {
                    return JSON.parse(LibFs.readFileSync(filePath).toString());
                }
                catch (e) {
                    throw new Error('[Config] Error:' + e.message);
                }
            }
            else {
                throw new Error('[Config] config file path have to be an absolute path!');
            }
        });
    }
    SpmHttp.getConfig = getConfig;
    /**
     * Get Spm Publish request config
     *
     * @returns {Promise<SpmConfig>}
     */
    function getRequestOption(path, params, method = RequestMethod.get) {
        return __awaiter(this, void 0, void 0, function* () {
            let spmHttpConfig = yield SpmHttp.getConfig();
            let spmSecretValue = yield SpmSecret.load();
            let requestConfig = {};
            requestConfig.host = spmHttpConfig.host;
            requestConfig.port = spmHttpConfig.port;
            requestConfig.method = RequestMethod[method];
            requestConfig.path = (_.isEmpty(params)) ? path + "?secret=" + spmSecretValue : path + "?secret=" + spmSecretValue + "&" + buildParam(params);
            return requestConfig;
        });
    }
    SpmHttp.getRequestOption = getRequestOption;
    function uploadFiles(filePath, fileInfo, req) {
        return __awaiter(this, void 0, void 0, function* () {
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
            fileStream.on('end', function () {
                req.end(enddata);
            });
            req.end(enddata);
        });
    }
    SpmHttp.uploadFiles = uploadFiles;
})(SpmHttp = exports.SpmHttp || (exports.SpmHttp = {}));
var SpmSecret;
(function (SpmSecret) {
    SpmSecret.SPM_LRC_PATH = LibPath.join(__dirname, "..", "..", "..", ".spmlrc");
    /**
     * Save secret value into .spmlrc
     *
     * @returns {void}
     */
    function save(value) {
        LibFs.writeFileSync(SpmSecret.SPM_LRC_PATH, value, "utf-8");
    }
    SpmSecret.save = save;
    /**
     * Load secret value from .spmlrc
     *
     * @returns {string}
     */
    function load() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield LibFs.readFileSync(SpmSecret.SPM_LRC_PATH).toString();
        });
    }
    SpmSecret.load = load;
})(SpmSecret = exports.SpmSecret || (exports.SpmSecret = {}));
//# sourceMappingURL=lib.js.map
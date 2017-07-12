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
var RequestMethod;
(function (RequestMethod) {
    RequestMethod[RequestMethod["post"] = 0] = "post";
    RequestMethod[RequestMethod["get"] = 1] = "get";
})(RequestMethod = exports.RequestMethod || (exports.RequestMethod = {}));
exports.rmdir = (dirPath) => __awaiter(this, void 0, void 0, function* () {
    let files = yield LibFs.readdir(dirPath);
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            let filePath = LibPath.join(dirPath, files[i]);
            let fileStat = yield LibFs.stat(filePath);
            if (fileStat.isFile()) {
                yield LibFs.unlink(filePath);
            }
            else {
                yield exports.rmdir(filePath);
            }
        }
    }
    yield LibFs.rmdir(dirPath);
});
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
exports.findProjectDir = (path) => {
    const pkg = require('../../../package.json');
    if (path.indexOf('node_modules') >= 0) {
        return LibPath.join(path.substr(0, path.indexOf('node_modules')));
    }
    if (path.indexOf(pkg.name) >= 0) {
        return LibPath.join(__dirname.substr(0, __dirname.indexOf(pkg.name)), '..');
    }
    return LibPath.join(path, '..', '..', '..', '..');
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
    function getRequestOption(path, method = RequestMethod.get) {
        return __awaiter(this, void 0, void 0, function* () {
            let spmHttpConfig = yield SpmHttp.getConfig();
            let requestConfig = {};
            requestConfig.host = spmHttpConfig.host;
            requestConfig.port = spmHttpConfig.port;
            requestConfig.method = RequestMethod[method];
            requestConfig.path = path;
            return requestConfig;
        });
    }
    SpmHttp.getRequestOption = getRequestOption;
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
        return LibFs.readFileSync(SpmSecret.SPM_LRC_PATH).toString();
    }
    SpmSecret.load = load;
})(SpmSecret = exports.SpmSecret || (exports.SpmSecret = {}));
//# sourceMappingURL=lib.js.map
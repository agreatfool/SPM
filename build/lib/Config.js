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
class Config {
    static instance() {
        if (Config._instance === undefined) {
            Config._instance = new Config();
        }
        return Config._instance;
    }
    constructor() {
        this._initialized = false;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            let filePath = LibPath.join(__dirname, '..', '..', 'config', 'config.json');
            let stats = yield LibFs.stat(filePath);
            if (stats.isFile()) {
                try {
                    this.options = JSON.parse(LibFs.readFileSync(filePath).toString());
                    this._initialized = true;
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
}
exports.default = Config;
//# sourceMappingURL=Config.js.map
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
const typeorm_1 = require("typeorm");
const lib_1 = require("../bin/lib/lib");
class Database {
    static instance() {
        if (Database._instance === undefined) {
            Database._instance = new Database();
        }
        return Database._instance;
    }
    constructor() {
        this._initialized = false;
    }
    get conn() {
        return this._conn;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let dir = LibPath.join(__dirname, 'entity');
                let files = yield LibFs.readdir(dir);
                let entities = [];
                for (let file of files) {
                    if (LibPath.basename(file).match(/.+\.js$/) === null) {
                        continue;
                    }
                    let outputs = require(LibPath.join(dir, file));
                    for (let key in outputs) {
                        entities.push(outputs[key]);
                    }
                }
                this._conn = yield typeorm_1.createConnection({
                    type: 'sqlite',
                    database: LibPath.join(lib_1.Spm.SPM_ROOT_PATH, 'Spm.db'),
                    entities: entities,
                    autoSchemaSync: false,
                });
                this._initialized = true;
            }
            catch (e) {
                throw new Error(`[Database] Error: ${e.message}`);
            }
        });
    }
}
exports.default = Database;

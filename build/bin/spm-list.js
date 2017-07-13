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
const program = require("commander");
const LibPath = require("path");
const LibFs = require("mz/fs");
const recursive = require("recursive-readdir");
const lib_1 = require("./lib/lib");
const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:uninstall');
program.version(pkg.version)
    .option('-p, --projectDir <dir>', 'project dir')
    .parse(process.argv);
const PROJECT_DIR_VALUE = program.projectDir === undefined ? undefined : program.projectDir;
class ListCLI {
    static instance() {
        return new ListCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('ListCLI start.');
            yield this._loopSpmProtoDir();
            yield this._show();
        });
    }
    _loopSpmProtoDir() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('ListCLI loopSpmProtoDir.');
            // 向上查找项目文件夹根目录
            if (!PROJECT_DIR_VALUE) {
                this._projectDir = lib_1.findProjectDir(__dirname);
            }
            else {
                this._projectDir = PROJECT_DIR_VALUE;
            }
            // 查找spm_protos文件夹是否存在，不存在则不需要卸载
            this._projectInstalled = {};
            this._projectProtoDir = LibPath.join(this._projectDir, "spm_protos");
            let protoDirStat = yield LibFs.stat(this._projectProtoDir);
            if (protoDirStat.isDirectory()) {
                let files = yield recursive(this._projectProtoDir, [".DS_Store"]);
                for (let file of files) {
                    let basename = LibPath.basename(file);
                    if (basename.match(/.+\.json/) !== null) {
                        let dirname = LibPath.dirname(file).replace(this._projectProtoDir, '').replace('\\', '').replace('/', '');
                        let packageOption = JSON.parse(LibFs.readFileSync(file).toString());
                        this._projectInstalled[dirname] = {
                            name: packageOption.name,
                            version: packageOption.version,
                            dependencies: packageOption.dependencies
                        };
                    }
                }
            }
        });
    }
    _show() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('ListCLI show.');
            for (let dirname in this._projectInstalled) {
                let protoInfo = this._projectInstalled[dirname];
                console.log(`+-- ${protoInfo.name}@${protoInfo.version}`);
                for (let dependName in protoInfo.dependencies) {
                    console.log(`|  | -- ${dependName}@${protoInfo.dependencies[dependName]}`);
                }
            }
        });
    }
}
ListCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
});
//# sourceMappingURL=spm-list.js.map
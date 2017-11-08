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
const LibFs = require("mz/fs");
const LibPath = require("path");
const program = require("commander");
const archiver = require("archiver");
const lib_1 = require("./lib/lib");
const pkg = require('../../package.json');
program.version(pkg.version)
    .parse(process.argv);
const OUTPUT_PATH = program.args[0] === undefined ? undefined : program.args[0];
class BackupCLI {
    static instance() {
        return new BackupCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('BackupCLI start.');
            yield this._validate();
            yield this._prepare();
            yield this._compress();
            yield this._backup();
            console.log('BackupCLI complete.');
        });
    }
    /**
     * 验证参数，数据，环境是否正确
     *
     * @returns {Promise<void>}
     * @private
     */
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('BackupCLI validate.');
            if (!OUTPUT_PATH) {
                throw new Error('output path is required, "sasdn-pm backup /tmp"');
            }
            let pathStat = yield LibFs.stat(OUTPUT_PATH);
            if (!pathStat.isDirectory()) {
                throw new Error('output path is not a directory');
            }
        });
    }
    /**
     * 准备命令中需要使用的参数，或创建文件夹。
     *
     * @returns {Promise<void>}
     * @private
     */
    _prepare() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('BackupCLI prepare.');
            let now = new Date();
            this._projectDir = lib_1.Spm.getProjectDir();
            this._tmpFilePath = LibPath.join(lib_1.Spm.SPM_ROOT_PATH, 'tmp');
            this._tmpFileName = `SpmPackage_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${Math.random().toString(16)}.zip`;
            yield lib_1.mkdir(this._tmpFilePath);
        });
    }
    /**
     * 创建备份的压缩包。
     *
     * @returns {Promise<void>}
     * @private
     */
    _compress() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('BackupCLI compress.');
            // 创建 archive 对象
            let archive = archiver('zip', { zlib: { level: 9 } });
            archive.on('error', (err) => {
                console.log(err.message);
            });
            // 添加 ${pwd}/store 到 archive 对象
            let storePath = LibPath.join(this._projectDir, 'store');
            if (LibFs.existsSync(storePath) && LibFs.statSync(storePath).isDirectory()) {
                archive.directory(storePath, '/store');
            }
            // 添加 ${pwd}/Spm.db 到 archive 对象
            let dbPath = LibPath.join(this._projectDir, 'Spm.db');
            if (LibFs.existsSync(dbPath) && LibFs.statSync(dbPath).isFile()) {
                archive.append(LibFs.createReadStream(dbPath), { name: 'Spm.db' });
            }
            // 由于执行 archive finalize 时，实际压缩包并未完成，所以需要用 promise 将下述代码包起来。
            // 通过判断 writeSteam 的 close 事件，来判断压缩包是否完成创建。
            yield new Promise((resolve, reject) => {
                let writeStream = LibFs.createWriteStream(LibPath.join(this._tmpFilePath, this._tmpFileName));
                writeStream.on('close', () => {
                    console.log('BackupCLI compress completed!');
                    resolve();
                });
                archive.pipe(writeStream);
                archive.finalize().catch((e) => {
                    reject(e);
                });
            });
        });
    }
    /**
     * 将已经创建的压缩包 rename 到指定文件夹。
     *
     * @returns {Promise<void>}
     * @private
     */
    _backup() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('BackupCLI backup.');
            const sourceFile = LibPath.join(this._tmpFilePath, this._tmpFileName);
            const outputFile = LibPath.join(OUTPUT_PATH, this._tmpFileName);
            yield LibFs.rename(sourceFile, outputFile);
            if (!LibFs.existsSync(outputFile) || !LibFs.statSync(outputFile).isFile()) {
                throw new Error(`${outputFile} not exists.`);
            }
        });
    }
}
exports.BackupCLI = BackupCLI;
BackupCLI.instance().run().catch((err) => {
    console.log('error:', err.message);
});
//# sourceMappingURL=sasdn-pm-backup.js.map
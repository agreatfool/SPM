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
const debug = require('debug')('SPM:CLI:install');
program.version(pkg.version)
    .parse(process.argv);
const OUTPUT_PATH = program.args[0] === undefined ? undefined : program.args[0];
class BackupCLI {
    static instance() {
        return new BackupCLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('BackupCLI start.');
            yield this._validate();
            yield this._prepare();
            yield this._compress();
            yield this._backup();
            debug('BackupCLI complete.');
            console.log('BackupCLI complete.');
        });
    }
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('BackupCLI validate.');
            if (!OUTPUT_PATH) {
                throw new Error('output path is required, "sasdn-pm backup /tmp"');
            }
            let protoStat = yield LibFs.stat(OUTPUT_PATH);
            if (!protoStat.isDirectory()) {
                throw new Error('output path is not a directory');
            }
        });
    }
    _prepare() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('PublishCLI prepare.');
            const now = new Date();
            this._projectDir = lib_1.Spm.getProjectDir();
            this._tmpDir = LibPath.join(lib_1.Spm.SPM_ROOT_PATH, 'tmp');
            this._tmpFileName = `SpmPackage_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${Math.random().toString(16)}.zip`;
            yield lib_1.mkdir(this._tmpDir);
        });
    }
    _compress() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('BackupCLI compress.');
            let tmpFilePath = LibPath.join(this._tmpDir, this._tmpFileName);
            // create a file to stream archive data to.
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                // create write stream
                let writeStream = LibFs.createWriteStream(tmpFilePath)
                    .on('close', () => {
                    resolve();
                });
                // archive init
                let archive = archiver('zip', { zlib: { level: 9 } })
                    .on('error', (err) => reject(err));
                archive.pipe(writeStream);
                // add store dir
                let storePath = LibPath.join(this._projectDir, 'store');
                if (LibFs.existsSync(storePath) && LibFs.statSync(storePath).isDirectory()) {
                    archive.directory(storePath, '/store');
                }
                // add Spm.db file
                let dbPath = LibPath.join(this._projectDir, 'Spm.db');
                if (LibFs.existsSync(dbPath) && LibFs.statSync(dbPath).isFile()) {
                    archive.append(LibFs.createReadStream(LibPath.join(this._projectDir, 'Spm.db')), { name: 'Spm.db' });
                }
                yield archive.finalize();
            }));
        });
    }
    _backup() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('BackupCLI backup.');
            let sourceFile = LibPath.join(this._tmpDir, this._tmpFileName);
            let destFile = LibPath.join(OUTPUT_PATH, this._tmpFileName);
            yield LibFs.rename(sourceFile, destFile, (err) => {
                if (err)
                    throw err;
                LibFs.stat(destFile, (err) => {
                    if (err)
                        throw err;
                });
            });
        });
    }
}
exports.BackupCLI = BackupCLI;
BackupCLI.instance().run().catch((err) => {
    debug('err: %O', err.message);
    console.log(err.message);
});
//# sourceMappingURL=sasdn-pm-backup.js.map
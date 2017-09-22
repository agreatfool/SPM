import * as LibFs from "mz/fs";
import * as LibPath from "path";
import * as program from "commander";
import * as archiver from "archiver";
import {mkdir, Spm} from "./lib/lib";

const pkg = require('../../package.json');
const debug = require('debug')('SPM:CLI:install');

program.version(pkg.version)
    .parse(process.argv);

const OUTPUT_PATH = program.args[0] === undefined ? undefined : program.args[0];

export class BackupCLI {

    private _projectDir: string;
    private _tmpDir: string;
    private _tmpFileName: string;

    static instance() {
        return new BackupCLI();
    }

    public async run() {
        debug('BackupCLI start.');
        await this._validate();
        await this._prepare();
        await this._compress();
        await this._backup();
    }

    private async _validate() {
        debug('BackupCLI validate.');

        if (!OUTPUT_PATH) {
            throw new Error('output path is required, "sasdn-pm backup /tmp"');
        }

        let protoStat = await LibFs.stat(OUTPUT_PATH);
        if (!protoStat.isDirectory()) {
            throw new Error('output path is not a directory');
        }
    }

    private async _prepare() {
        debug('PublishCLI prepare.');

        const now = new Date();

        this._projectDir = Spm.getProjectDir();
        this._tmpDir = LibPath.join(Spm.SPM_ROOT_PATH, 'tmp');
        this._tmpFileName = `SpmPackage_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${Math.random().toString(16)}.zip`;
        await mkdir(this._tmpDir);
    }

    private async _compress() {
        debug('BackupCLI compress.');

        let tmpFilePath = LibPath.join(this._tmpDir, this._tmpFileName);

        // create a file to stream archive data to.
        await new Promise(async (resolve, reject) => {
            // create write stream
            let writeStream = LibFs.createWriteStream(tmpFilePath)
                .on('close', () => {
                    resolve();
                });
            // archive init
            let archive = archiver('zip', {zlib: {level: 9}})
                .on('error', (err) => reject(err)) as archiver.Archiver;

            archive.pipe(writeStream);

            // add store dir
            let storePath = LibPath.join(this._projectDir, 'store');
            if (LibFs.existsSync(storePath) && LibFs.statSync(storePath).isDirectory()) {
                archive.directory(storePath, '/store');
            }

            // add Spm.db file
            let dbPath = LibPath.join(this._projectDir, 'Spm.db');
            if (LibFs.existsSync(dbPath) && LibFs.statSync(dbPath).isFile()) {
                archive.append(LibFs.createReadStream(LibPath.join(this._projectDir, 'Spm.db')), {name: 'Spm.db'});
            }

            await archive.finalize();
        });

        debug('BackupCLI compress finish.');
    }

    private async _backup() {
        debug('BackupCLI backup.');
        let sourceFile = LibPath.join(this._tmpDir, this._tmpFileName);
        let destFile = LibPath.join(OUTPUT_PATH, this._tmpFileName);

        await LibFs.rename(sourceFile, destFile, (err) => {
            if (err) throw err;
            LibFs.stat(destFile, (err) => {
                if (err) throw err;
                debug('BackupCLI backup finish.');
            });
        });
    }
}

BackupCLI.instance().run().catch((err: Error) => {
    debug('err: %O', err.message);
});
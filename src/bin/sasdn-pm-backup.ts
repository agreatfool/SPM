import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import * as program from 'commander';
import * as archiver from 'archiver';
import {mkdir, Spm} from './lib/lib';

const pkg = require('../../package.json');

program.version(pkg.version)
    .description('backup store dir and sqlite db file')
    .usage('[Options] <output path>')
    .parse(process.argv);

const OUTPUT_PATH = program.args[0] === undefined ? undefined : program.args[0];

export class BackupCLI {

    private _projectDir: string;
    private _tmpFilePath: string;
    private _tmpFileName: string;

    static instance() {
        return new BackupCLI();
    }

    public async run() {
        console.log('BackupCLI start.');

        await this._validate();
        await this._prepare();
        await this._compress();
        await this._backup();

        console.log('BackupCLI complete.');
    }

    /**
     * 验证参数，数据，环境是否正确
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _validate() {
        console.log('BackupCLI validate.');

        if (!OUTPUT_PATH) {
            throw new Error('output path is required, "sasdn-pm backup /tmp"');
        }

        let pathStat = await LibFs.stat(OUTPUT_PATH);
        if (!pathStat.isDirectory()) {
            throw new Error('output path is not a directory');
        }
    }

    /**
     * 准备命令中需要使用的参数，或创建文件夹。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _prepare() {
        console.log('BackupCLI prepare.');

        let now = new Date();

        this._projectDir = Spm.getProjectDir();
        this._tmpFilePath = LibPath.join(Spm.SPM_ROOT_PATH, 'tmp');
        this._tmpFileName = `SpmPackage_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${Math.random().toString(16)}.zip`;
        await mkdir(this._tmpFilePath);
    }

    /**
     * 创建备份的压缩包。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _compress() {
        console.log('BackupCLI compress.');

        // 创建 archive 对象
        let archive = archiver('zip', {zlib: {level: 9}}) as archiver.Archiver;
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
            archive.append(LibFs.createReadStream(dbPath), {name: 'Spm.db'});
        }

        // 由于执行 archive finalize 时，实际压缩包并未完成，所以需要用 promise 将下述代码包起来。
        // 通过判断 writeSteam 的 close 事件，来判断压缩包是否完成创建。
        await new Promise((resolve, reject) => {
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
    }

    /**
     * 将已经创建的压缩包 rename 到指定文件夹。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _backup() {
        console.log('BackupCLI backup.');

        const sourceFile = LibPath.join(this._tmpFilePath, this._tmpFileName);
        const outputFile = LibPath.join(OUTPUT_PATH, this._tmpFileName);

        await LibFs.rename(sourceFile, outputFile);

        if (!LibFs.existsSync(outputFile) || !LibFs.statSync(outputFile).isFile()) {
            throw new Error(`${outputFile} not exists.`);
        }
    }
}

BackupCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});

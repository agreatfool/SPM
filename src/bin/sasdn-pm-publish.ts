import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import * as program from 'commander';
import * as archiver from 'archiver';
import * as request from 'request';
import * as _ from 'underscore';
import {Spm, SpmPackageConfig, mkdir} from './lib/lib';

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

export class PublishCLI {
    private _projectDir: string;
    private _packageConfig: SpmPackageConfig;
    private _tmpFilePath: string;
    private _tmpFileName: string;

    static instance() {
        return new PublishCLI();
    }

    public async run() {
        console.log('PublishCLI start.');

        await this._validate();
        await this._prepare();
        await this._compress();
        await this._publish();

        console.log('PublishCLI complete.');
    }

    /**
     * 验证参数，数据，环境是否正确
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _validate() {
        console.log('PublishCLI validate.');

        this._projectDir = Spm.getProjectDir();

        let configStat = await LibFs.stat(LibPath.join(this._projectDir, 'spm.json'));
        if (!configStat.isFile()) {
            throw new Error('File: `spm.json` not found in project:' + this._projectDir);
        }

        let protoStat = await LibFs.stat(LibPath.join(this._projectDir, 'proto'));
        if (!protoStat.isDirectory()) {
            throw new Error('Dir: `proto` not found in project:' + this._projectDir);
        }
    }

    /**
     * 准备命令中需要使用的参数，或创建文件夹。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _prepare() {
        console.log('PublishCLI prepare.');

        this._packageConfig = Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));

        if (!this._packageConfig.name || _.isEmpty(this._packageConfig.name) || typeof this._packageConfig.name !== 'string') {
            throw new Error('Package param: `name` is required');
        }

        if (!this._packageConfig.version || _.isEmpty(this._packageConfig.version) || typeof this._packageConfig.version !== 'string') {
            throw new Error('Package param: `version` is required');
        }

        let packageStat = await LibFs.stat(LibPath.join(this._projectDir, 'proto', this._packageConfig.name));
        if (!packageStat.isDirectory()) {
            throw new Error(`Dir: ${this._packageConfig.name} not found in project:' + this._projectDir`);
        }

        // 创建临时文件夹，生成临时文件名
        this._tmpFilePath = LibPath.join(Spm.SPM_ROOT_PATH, 'tmp');
        this._tmpFileName = Math.random().toString(16) + '.zip';
        await mkdir(this._tmpFilePath);
    }

    /**
     * 创建发布使用的压缩包。
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _compress() {
        console.log('PublishCLI compress.');

        // 创建 archive 对象
        let archive = archiver('zip', {zlib: {level: 9}}) as archiver.Archiver;
        archive.on('error', (err) => {
            console.log(err.message);
        });

        // 添加 ${pwd}/proto/${pkgName} 到 archive 对象
        archive.directory(LibPath.join(this._projectDir, 'proto', this._packageConfig.name), false);

        // 添加 ${pwd}/spm.json 到 archive 对象
        archive.append(LibFs.createReadStream(LibPath.join(this._projectDir, 'spm.json')), {name: 'spm.json'});

        // 由于执行 archive finalize 时，实际压缩包并未完成，所以需要用 promise 将下述代码包起来。
        // 通过判断 writeSteam 的 close 事件，来判断压缩包是否完成创建。
        await new Promise((resolve, reject) => {
            let writeStream = LibFs.createWriteStream(LibPath.join(this._tmpFilePath, this._tmpFileName));
            writeStream.on('close', () => {
                console.log('PublishCLI compress completed!');
                resolve();
            });

            archive.pipe(writeStream);
            archive.finalize().catch((e) => {
                reject(e);
            });
        });
    }

    /**
     * 访问 /v1/publish, 提交压缩包
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _publish() {
        console.log('PublishCLI publish.');

        // build params
        let params = {
            name: this._packageConfig.name,
            version: this._packageConfig.version,
            description: this._packageConfig.description || '',
            dependencies: JSON.stringify(this._packageConfig.dependencies),
            secret: Spm.loadSecret(),
        };
        // upload file stream
        let filePath = LibPath.join(this._tmpFilePath, this._tmpFileName);
        let fileUploadStream = LibFs.createReadStream(filePath);

        // create post
        let req = request.post(`${Spm.getConfig().remote_repo}/v1/publish`, (err, httpResponse) => {
            if (err) {
                throw err;
            }

            console.log(`PublishCLI publish: [Response] - ${httpResponse.body}`);
            LibFs.unlink(filePath).catch((err) => {
                throw err;
            });
        });

        // append form data
        let form = req.form();
        for (let key in params) {
            form.append(key, params[key]);
        }
        form.append('fileUpload', fileUploadStream, {filename: `${Math.random().toString(16)}.zip`});
    };
}

PublishCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});
import * as LibPath from 'path';
import * as LibFs from 'mz/fs';
import * as program from 'commander';
import * as _ from 'underscore';
import {Spm, SpmPackageConfig, httpRequest} from './lib/lib';

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

export class SecretCLI {

    private _projectDir: string;
    private _packageConfig: SpmPackageConfig;

    static instance() {
        return new SecretCLI();
    }

    public async run() {
        console.log('SecretCLI start.');

        await this._validate();
        await this._saveSecret();

        console.log('SecretCLI complete.');
    }

    /**
     * 验证参数，数据，环境是否正确
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _validate() {
        console.log('SecretCLI validate.');

        this._projectDir = Spm.getProjectDir();

        let configStat = await LibFs.stat(LibPath.join(this._projectDir, 'spm.json'));
        if (!configStat.isFile()) {
            throw new Error('File: `spm.json` not found in project:' + this._projectDir);
        }

        this._packageConfig = Spm.getSpmPackageConfig(LibPath.join(this._projectDir, 'spm.json'));
        if (!this._packageConfig.name || _.isEmpty(this._packageConfig.name) || typeof this._packageConfig.name !== 'string') {
            throw new Error('Package param: `name` is required');
        }
    }

    /**
     * 保存 secret 到本地文件
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _saveSecret() {
        console.log('SecretCLI saveSecret');

        let response = await this._genSecret();

        Spm.saveSecret(response.secret);
    }

    /**
     * 访问 /v1/secret，获取 secret
     *
     * @returns {Promise<void>}
     * @private
     */
    private async _genSecret(): Promise<{ secret: string }> {
        console.log('SecretCLI genSecret.');

        let params = {
            name: this._packageConfig.name
        };

        return await httpRequest.post('/v1/secret', params);
    }
}

SecretCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});
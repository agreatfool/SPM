import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import {InstallCLI} from "../../src/bin/spm-install";
import {Spm, rmdir} from "../../src/bin/lib/lib";

jest.mock('../../src/bin/lib/request');

describe('SpmInstall', async () => {

    let installCLI = InstallCLI.instance();

    beforeAll(async () => {
        process.chdir('demo');
        //await rmdir(LibPath.join(process.cwd(), Spm.INSTALL_DIR_NAME));

    });

    afterAll(async() => {
        process.chdir('..');
    });

    // test
    test('_prepare: prepare data and validate data is right', async () => {
        await installCLI['_prepare']();


        expect(installCLI['_tmpDir']).toMatchSnapshot();
        expect(installCLI['_tmpFileName']).toMatch(/.zip/);
        expect(installCLI['_projectDir']).toMatchSnapshot();
        expect(installCLI['_spmPackageInstallDir']).toMatchSnapshot();
        expect(installCLI['_spmPackageInstalledMap']).toMatchSnapshot();

        // test
        let files1 = await LibFs.readdir(LibPath.join(installCLI['_tmpDir'], '..'));
        expect(files1[files1.indexOf('tmp')]).toEqual('tmp');

        let files2 = await LibFs.readdir(LibPath.join(installCLI['_spmPackageInstallDir'], '..'));
        expect(files2[files2.indexOf(Spm.INSTALL_DIR_NAME)]).toEqual(Spm.INSTALL_DIR_NAME);
    });

    // test
    test('_install: validate install is finish', async () => {
        // await installCLI['_install']();
    });
});
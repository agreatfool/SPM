import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import * as lib from "../../../src/bin/lib/lib";

// CONST
const TMP_DIR_NAME = "tmp";

describe('mkdir', async () => {

    beforeAll(() => {
        process.chdir('demo');
    });

    afterAll(async() => {
        await lib.rmdir(LibPath.join(process.cwd(), TMP_DIR_NAME));
        process.chdir('..');
    });

    // test
    test('test mkdir is succeed', async() => {
        // run
        await lib.mkdir(LibPath.join(process.cwd(), TMP_DIR_NAME));

        // test
        let files = await LibFs.readdir(process.cwd());
        expect(files[files.indexOf(TMP_DIR_NAME)]).toEqual(TMP_DIR_NAME);
    });

});

describe('rmdir', async () => {

    beforeAll(async() => {
        process.chdir('demo');
        await lib.mkdir(LibPath.join(process.cwd(), TMP_DIR_NAME));
        await lib.mkdir(LibPath.join(process.cwd(), TMP_DIR_NAME, "mock"));
        await LibFs.writeFile(LibPath.join(process.cwd(), TMP_DIR_NAME, "mock.txt"), "mock");
    });

    afterAll(async() => {
        process.chdir('..');
    });

    // test
    test('test rmdir is succeed', async() => {
        // run
        await lib.rmdir(LibPath.join(process.cwd(), TMP_DIR_NAME));

        // test
        let files = await LibFs.readdir(process.cwd());
        expect(files.indexOf(TMP_DIR_NAME)).toEqual(-1);
    });

});

describe('Spm', async () => {
    let lrcPath = LibPath.join(process.cwd(), 'demo', '.spmlrc');

    beforeAll(() => {
        process.chdir('demo');
        if (LibFs.existsSync(lrcPath)) {
            LibFs.unlinkSync(lrcPath);
        }
    });

    afterAll(() => {
        process.chdir('..');
    });

    test('getProjectDir', () => {
        expect(lib.Spm.getProjectDir()).toEqual(process.cwd());
    });

    test('SaveSecret/LoadSecret: secret is saved', () => {
        lib.Spm.saveSecret('1q2w3e4r');
        expect(lib.Spm.loadSecret()).toEqual('1q2w3e4r');
    });

    test('LoadSecret: unlink .spmlrc file will return ""', () => {
        // run
        if (LibFs.existsSync(lrcPath)) {
            LibFs.unlinkSync(lrcPath);
        }
        // test
        expect(lib.Spm.loadSecret()).toEqual('');
    });

    test('GetConfig: toMatchSnapshot()', () => {
        expect(lib.Spm.getConfig()).toMatchSnapshot();
    });

    test('GetConfig: toThrow(\'[Config] config file path have to be an absolute path!\')', () => {
        expect(() => {
            lib.Spm.getConfig(LibPath.join(process.cwd(), 'config.json'))
        }).toThrow('[Config] config file path have to be an absolute path!');
    });

    test('GetSpmPackageConfig: toMatchSnapshot()',() => {
        expect(lib.Spm.getSpmPackageConfig(LibPath.join(process.cwd(), 'spm.json'))).toMatchSnapshot();
    });

    test('GetInstalledSpmPackageMap: toMatchSnapshot()', async () => {
        await expect(lib.Spm.getInstalledSpmPackageMap()).resolves.toMatchSnapshot();
        await expect(lib.Spm.getInstalledSpmPackageMap(LibPath.join(process.cwd(), '..'))).resolves.toEqual({});
    });

    test('ReplaceStringInFile: toEqual(1.0.0)', async () => {
        const configPath = LibPath.join(process.cwd(), 'spm.json');
        await lib.Spm.replaceStringInFile(configPath, [
            [new RegExp(`0.0.0`, 'g'), `1.0.0`]
        ]);

        expect(lib.Spm.getSpmPackageConfig(configPath).version).toEqual('1.0.0');

        await lib.Spm.replaceStringInFile(configPath, [
            [new RegExp(`1.0.0`, 'g'), `0.0.0`]
        ]);
    });

    test('ReplaceStringInFile: toThrow()', () => {
        const configPath = LibPath.join(process.cwd(), 'spm_error.json');
        expect(() => { lib.Spm.getSpmPackageConfig(configPath) }).toThrowErrorMatchingSnapshot();
    });
});

describe('SpmPackageRequest', async () => {
    const emoji = "♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓";

    test('GetRequestOption: toMatchSnapshot()', () => {
        expect(lib.SpmPackageRequest.getRequestOption('/mock', lib.RequestMethod.post)).toMatchSnapshot();
    });

    test('ParseResponse: toEqual(♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓)', () => {
        expect(lib.SpmPackageRequest.parseResponse(JSON.stringify({code: 0, msg: emoji}))).toEqual(emoji);
    });

    test('ParseResponse: toThrow("something error")', () => {
        expect(() => {
            lib.SpmPackageRequest.parseResponse(JSON.stringify({code: -1, msg: "something error"}))
        }).toThrow("something error");
    });
});
import * as program from 'commander';
import {Spm} from "./lib/lib";

const pkg = require('../../package.json');

program.version(pkg.version)
    .parse(process.argv);

export class CheckCLI {

    static instance() {
        return new CheckCLI();
    }

    public async run() {
        console.log('CheckCLI start.');
        await Spm.checkVersion();
    }
}

CheckCLI.instance().run().catch((err: Error) => {
    console.log('error:', err.message);
});

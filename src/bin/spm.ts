#!/usr/bin/env node

import * as program from "commander";

const pkg = require('../../package.json');

program.version(pkg.version)
    .command('secret [options]', 'set secret key in spm commander')
    .command('publish [options]', 'publish proto dir to spm server')
    .command('install [options]', 'install proto from spm server')
    .parse(process.argv);
#!/usr/bin/env node

import * as program from 'commander';

const pkg = require('../../package.json');

program.version(pkg.version)
    .command('install [Options]', 'install proto from spm server')
    .command('installed [Options]', 'show all installed proto or specific proto')
    .command('list [Options]', 'show all remote proto')
    .command('publish [Options]', 'publish proto dir to spm server')
    .command('search [Options]', 'search proto from spm server')
    .command('secret [Options]', 'set secret key in spm commander')
    .command('uninstall [Options]', 'uninstall local proto')
    .command('backup [Options]', 'backup store dir and sqlite db file')
    .command('check [Options]', 'check if version of packages installed in local is latest')
    .command('update [Options]', 'update proto to latest version')
    .command('delete [Options]', 'delete proto package in spm server')
    .parse(process.argv);

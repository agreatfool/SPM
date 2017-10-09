#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const pkg = require('../../package.json');
program.version(pkg.version)
    .command('install [options]', 'install proto from spm server')
    .command('list [options]', 'show all installed proto')
    .command('publish [options]', 'publish proto dir to spm server')
    .command('search [options]', 'search proto from spm server')
    .command('secret [options]', 'set secret key in spm commander')
    .command('uninstall [options]', 'install proto from spm server')
    .command('backup [options]', 'backup store dir and sqlite db file')
    .parse(process.argv);

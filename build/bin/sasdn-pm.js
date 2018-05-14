#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const pkg = require('../../package.json');
program.version(pkg.version)
    .command('install [options]', 'install proto from spm server')
    .command('installed [options]', 'show all installed proto')
    .command('list', 'show all remote proto')
    .command('publish', 'publish proto dir to spm server')
    .command('search [options]', 'search proto from spm server')
    .command('secret [options]', 'set secret key in spm commander')
    .command('uninstall [options]', 'install proto from spm server')
    .command('backup [options]', 'backup store dir and sqlite db file')
    .command('check', 'check if version of packages installed in local is latest')
    .command('update [options]', 'update proto to latest version')
    .command('delete [options]', 'logically delete proto package in spm server')
    .command('changeSecret [options]', 'change secret of proto package in spm server')
    .parse(process.argv);

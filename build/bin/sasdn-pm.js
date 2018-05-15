#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const pkg = require('../../package.json');
program.version(pkg.version)
    .command('backup <path>', 'backup store dir and sqlite db file')
    .command('check', 'check if version of packages installed in local is latest')
    .command('delete <package> <password>', 'delete proto package in spm server')
    .command('install [<package>[@version]]', 'install proto from spm server')
    .command('installed [package]', 'show all installed protos or specified proto if package name provided')
    .command('list', 'show all remote protos registered in SPM')
    .command('publish', 'publish proto dir to spm server')
    .command('search [Options] <<package>[@version]>', 'search proto from spm server')
    .command('secret', 'set secret key in spm commander')
    .command('uninstall <package>', 'uninstall local proto')
    .command('update [package]', 'update proto to latest version')
    .parse(process.argv);

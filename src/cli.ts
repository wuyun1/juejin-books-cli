#!/usr/bin/env node
const path = require('path');
const args = process.argv.slice(2);
const argv = require('minimist')(args);

console.log(argv);
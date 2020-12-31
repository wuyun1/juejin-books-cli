#!/usr/bin/env node
"use strict";

function _react() {
  const data = _interopRequireDefault(require("react"));

  _react = function _react() {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const path = require('path');

const args = process.argv.slice(2);

const argv = require('minimist')(args);

console.log(argv);
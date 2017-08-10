#!/bin/bash

BASEDIR=$(dirname "$0")
cd ${BASEDIR}/../

DEBUG=SPM:* node ./build/bin/sasdn-pm.js backup "$@"
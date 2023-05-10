#!/bin/sh
node ./scripts/build-non-split.js && tsc -p tsconfig.extension.json;
yarn run esbuild
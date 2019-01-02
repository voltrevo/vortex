#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/.."

rm -rf build/website
cp -a src build/website

cp build/webpack/* build/website/playground/.
rm build/website/playground/*.ts
mv build/website/playground/playground.bundle.js build/website/playground/index.js

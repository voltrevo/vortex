#!/bin/bash -e

rm -rf build
npx webpack

cp -a src build/website

cp build/webpack/* build/website/playground/.
rm build/website/playground/*.ts
mv build/website/playground/playground.bundle.js build/website/playground/index.js

cd build/website
npx live-server . --no-browser --host 0.0.0.0

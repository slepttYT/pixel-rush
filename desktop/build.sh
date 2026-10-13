#!/bin/bash
# Builds the Windows EXE from the SAME game file as the HTML release (one shared codebase).
# Usage: desktop/build.sh 0.5   -> releases/Pixel_Rush_0.5.exe
set -euo pipefail
VER="${1:-0.5}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
NEU_VER=6.5.0
cd "$HERE"
# 1. the game itself becomes the window's page
cp "$ROOT/Pixel_Rush_${VER}.html" resources/index.html
# 2. Neutralino runtime binary + client library (downloaded once, not committed)
mkdir -p bin
if [ ! -f bin/neutralino-win_x64.exe ]; then
  curl -sSL -o /tmp/neu.zip "https://github.com/neutralinojs/neutralinojs/releases/download/v${NEU_VER}/neutralinojs-v${NEU_VER}.zip"
  unzip -o -q /tmp/neu.zip neutralino-win_x64.exe -d bin
fi
if [ ! -f resources/js/neutralino.js ]; then
  npm pack @neutralinojs/lib@"${NEU_VER}" --silent >/dev/null 2>&1 || npm pack @neutralinojs/lib --silent >/dev/null
  tar -xzf neutralinojs-lib-*.tgz package/dist/neutralino.js && mv package/dist/neutralino.js resources/js/ && rm -rf package neutralinojs-lib-*.tgz
fi
# 3. pack everything into one EXE (resources embedded, nothing else to ship)
npx --yes @neutralinojs/neu@11.8.0 build --release --embed-resources
mkdir -p "$ROOT/releases"
cp dist/Pixel_Rush/Pixel_Rush-win_x64.exe "$ROOT/releases/Pixel_Rush_${VER}.exe"
echo "built releases/Pixel_Rush_${VER}.exe"

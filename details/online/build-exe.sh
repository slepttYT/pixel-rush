#!/bin/bash
# Packs pixel-rush-server.js into a single Windows EXE (Node single executable application). Nothing to install for players.
# Usage: details/online/build-exe.sh   ->  Pixel-Rush-Server.exe at the top of the repository
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"; cd "$HERE"
NODE_VER="$(node --version)"   # the blob must be made by the same Node version as the exe
[ -f node.exe ] || curl -sSL -o node.exe "https://nodejs.org/dist/${NODE_VER}/win-x64/node.exe"
echo '{"main":"pixel-rush-server.js","output":"sea-prep.blob","disableExperimentalSEAWarning":true}' > sea-config.json
node --experimental-sea-config sea-config.json
cp node.exe "$ROOT/Pixel-Rush-Server.exe"
npx --yes postject@1.0.0-alpha.6 "$ROOT/Pixel-Rush-Server.exe" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite
rm -f sea-config.json sea-prep.blob
echo "built Pixel-Rush-Server.exe"

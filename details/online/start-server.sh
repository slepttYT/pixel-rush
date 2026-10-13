#!/bin/sh
# Pixel Rush online server for macOS / Linux (needs Node.js 18 or newer)
cd "$(dirname "$0")" && exec node pixel-rush-server.js "$@"

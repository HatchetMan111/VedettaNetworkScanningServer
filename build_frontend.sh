#!/usr/bin/env bash
# Baut das React/Vite-Frontend nach ../static (committet, damit der LXC kein Node braucht).
set -euo pipefail
cd "$(dirname "$0")/frontend"

# node/npm finden (auf Phils Kiste unter ~/.local/node/bin)
export PATH="$HOME/.local/node/bin:$PATH"
command -v npm >/dev/null || { echo "npm nicht gefunden. Node.js installieren."; exit 1; }

echo "▶ npm install"
npm install --no-audit --no-fund

echo "▶ npm run build"
npm run build

echo "▶ Fertig. Build liegt in ../static:"
ls -la ../static
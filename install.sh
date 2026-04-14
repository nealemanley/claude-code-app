#!/bin/bash
# ─────────────────────────────────────────────
# Claude Code Launcher — install script
# Run this once from the app folder:
#   cd ~/Downloads/claude-code-app && bash install.sh
# ─────────────────────────────────────────────

set -e

echo ""
echo "⚡ Claude Code Launcher — installer"
echo "────────────────────────────────────"
echo ""

# Check node
if ! command -v node &>/dev/null; then
  echo "❌  Node.js not found. Install it with: brew install node"
  exit 1
fi
echo "✓  Node $(node --version)"

# Check npm
if ! command -v npm &>/dev/null; then
  echo "❌  npm not found."
  exit 1
fi
echo "✓  npm $(npm --version)"

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building native terminal module (node-pty)..."
npx electron-rebuild -f -w node-pty 2>/dev/null || {
  echo "⚠   node-pty build warning — trying alternative..."
  npm install --ignore-scripts
  cd node_modules/node-pty && npm run build 2>/dev/null || true && cd ../..
}

echo ""
echo "────────────────────────────────────"
echo "✓  Done! To launch:"
echo ""
echo "   npm start"
echo ""
echo "To build a .app you can put in your Dock:"
echo ""
echo "   npm run build"
echo "   (output will be in dist/)"
echo "────────────────────────────────────"
echo ""

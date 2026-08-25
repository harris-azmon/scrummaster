#!/bin/bash
set -e

echo "Building Scrummaster VS Code Extension..."
cd scrummaster-vscode
npm install
npx vsce package -o ../scrummaster.vsix
echo "Build complete: scrummaster.vsix"

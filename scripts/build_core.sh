#!/bin/bash
set -e

echo "Building Scrummaster Core Package..."
cd scrummaster-core
python -m pip install --upgrade build
python -m build
echo "Build complete: scrummaster-core/dist/"

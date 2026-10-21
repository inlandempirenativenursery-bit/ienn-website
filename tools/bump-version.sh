#!/bin/sh
# Bump the cache-busting ?v= on local js/css includes in index.html and order.html.
# Usage: tools/bump-version.sh [version]   (default: short HEAD commit)
V=${1:-$(git rev-parse --short HEAD)}
sed -i -E "s/\.(js|css)\?v=[A-Za-z0-9._-]+\"/.\1?v=$V\"/g" index.html order.html && echo "v=$V"

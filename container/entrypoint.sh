#!/bin/bash
set -e

cd /app

# Cache TypeScript build across container restarts.
# /app/src is host-mounted (persistent). We store the build hash there
# so we only recompile when source .ts files actually change.
CACHE_DIR=/app/src/.build-cache
DIST_DIR="$CACHE_DIR/dist"
HASH_FILE="$CACHE_DIR/hash"

SRC_HASH=$(find src -type f -name '*.ts' ! -path 'src/.build-cache/*' -exec md5sum {} + 2>/dev/null | sort | md5sum | cut -d' ' -f1)
CACHED_HASH=""
[ -f "$HASH_FILE" ] && CACHED_HASH=$(cat "$HASH_FILE")

if [ "$SRC_HASH" != "$CACHED_HASH" ] || [ ! -d "$DIST_DIR" ]; then
  echo "Source changed — recompiling TypeScript..." >&2
  rm -rf "$DIST_DIR"
  mkdir -p "$CACHE_DIR"
  npx tsc --outDir "$DIST_DIR" 2>&1 >&2
  echo "$SRC_HASH" > "$HASH_FILE"
else
  echo "Build cache hit — skipping tsc" >&2
fi

ln -sf /app/node_modules "$DIST_DIR/node_modules"
cat > /tmp/input.json
node "$DIST_DIR/index.js" < /tmp/input.json

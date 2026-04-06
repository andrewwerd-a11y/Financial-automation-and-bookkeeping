#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist"
ZIP_PATH="$OUT_DIR/phase2-classification-review-foundation.zip"

mkdir -p "$OUT_DIR"
rm -f "$ZIP_PATH"

cd "$ROOT_DIR"
zip -r "$ZIP_PATH" . \
  -x ".git/*" \
  -x "**/node_modules/*" \
  -x "backend/data/*.db" \
  -x "backend/uploads/*" \
  -x "dist/*.zip"

echo "Created: $ZIP_PATH"

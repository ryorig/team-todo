#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h}"
APP_NAME="Team ToDo Widget"
APP_DIR="$ROOT/$APP_NAME.app"
BUILD_DIR="$ROOT/.build/release"

cd "$ROOT"
swift build -c release
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"
cp "$BUILD_DIR/TeamTodoWidget" "$APP_DIR/Contents/MacOS/TeamTodoWidget"
cp "$ROOT/Info.plist" "$APP_DIR/Contents/Info.plist"
chmod +x "$APP_DIR/Contents/MacOS/TeamTodoWidget"
echo "Built: $APP_DIR"

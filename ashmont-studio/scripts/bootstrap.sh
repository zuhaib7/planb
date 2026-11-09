#!/usr/bin/env bash
# Reproduces how this project was scaffolded (Part 7 of the build brief), with the
# corrections found while running it. You do NOT need this to work on the repo:
# use `npm ci` instead. Kept for reference and for starting a sibling app (e.g. the staff CRM).
set -euo pipefail

APP="${1:-ashmont-studio}"

npm create tauri-app@4.7.5 "$APP" -- --template react-ts --manager npm -y
cd "$APP"

# --save-exact pins versions (supply-chain requirement).
npm install --save-exact framer-motion gsap zustand @tanstack/react-query i18next react-i18next \
  zod three @react-three/fiber @react-three/drei react-router-dom
npm install --save-exact -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event @playwright/test @axe-core/playwright \
  eslint typescript-eslint @types/three @types/node

# Opener is already in the template. The updater needs a public key and endpoint
# before it can start; this repo compiles it in only with `--features updater`.
npm run tauri add store
npm run tauri add updater

# Mobile targets need the Android SDK/NDK and (for iOS) macOS with Xcode.
if [[ -n "${ANDROID_HOME:-}" ]]; then npm run tauri android init; else echo "skip android init: ANDROID_HOME not set"; fi
if [[ "$(uname)" == "Darwin" ]] && command -v xcodebuild >/dev/null; then npm run tauri ios init; else echo "skip ios init: needs macOS + Xcode"; fi

mkdir -p src/{app,features/{home,projects,services,insights,consultation,about,contact,settings},design,i18n/locales,lib,content,assets/{models,images,video}} docs e2e
mkdir -p public/draco && cp node_modules/three/examples/jsm/libs/draco/gltf/draco_{decoder.js,decoder.wasm,wasm_wrapper.js} public/draco/

echo "Scaffold ready."

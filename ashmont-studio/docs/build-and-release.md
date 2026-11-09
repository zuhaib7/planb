# Build and release

## Prerequisites

- Node 22 LTS (20+ works), Rust stable (built here with 1.97).
- Linux: `sudo apt-get install -y libwebkit2gtk-4.1-dev librsvg2-dev libayatana-appindicator3-dev libxdo-dev build-essential file`
- macOS: Xcode command-line tools (full Xcode for iOS).
- Windows: Microsoft C++ Build Tools and WebView2 (preinstalled on Windows 11).
- Android: Android Studio, SDK, NDK, `ANDROID_HOME` and `NDK_HOME` set, Java 17.

## Daily commands

```bash
cd ashmont-studio
npm ci
npm run dev            # web only, http://localhost:1420
npm run tauri dev      # desktop window with hot reload
npm run check          # typecheck + lint + unit tests + build
npm run test:e2e       # Playwright + axe (builds must exist: npm run build first)
```

Set `CHROMIUM_PATH` to reuse an installed Chromium for e2e.

## Configuration

Copy `.env.example` to `.env` and set `VITE_CONSULTATION_ENDPOINT` (HTTPS only, hosted in KSA). Add its origin to `connect-src` in `src-tauri/tauri.conf.json`. Without it the form shows "Online requests are not available yet" instead of pretending to send.

## Desktop installers

```bash
npm run tauri build                         # all bundles for the current OS
npm run tauri build -- --bundles deb,appimage   # Linux
npm run tauri build -- --bundles msi,nsis       # Windows
npm run tauri build -- --bundles app,dmg        # macOS
```

Output: `src-tauri/target/release/bundle/`. Each OS builds its own installers; use a CI matrix (ubuntu, windows, macos) for all three.

## Mobile

Not initialised in this repo yet (the build machine had no Android SDK or Xcode). On a machine that has them:

```bash
npm run tauri android init
npm run tauri android build -- --apk --aab
npm run tauri ios init        # macOS + Xcode
npm run tauri ios build
```

Commit the generated `src-tauri/gen/android` and `src-tauri/gen/apple` projects. The repo-root `.gitignore` ignores `gen/`, so add `!ashmont-studio/src-tauri/gen/android` and `!ashmont-studio/src-tauri/gen/apple` exceptions first.

## Signed updater

1. `npm run tauri signer generate -- -w ~/.tauri/ashmont-updater.key` (keep the key and password out of the repo).
2. Put the **public** key in `tauri.conf.json`:
   ```json
   "bundle": { "createUpdaterArtifacts": true },
   "plugins": { "updater": { "pubkey": "<public key>", "endpoints": ["https://updates.ashmont.com.sa/{{target}}/{{arch}}/{{current_version}}"] } }
   ```
3. In CI set `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as secrets.
4. Build with the updater compiled in: `npm run tauri build -- --features updater`.

## Code signing (separate tasks, plan time for each)

| Platform | Needs | Notes |
|---|---|---|
| Windows | OV or EV code-signing certificate (cloud HSM such as Azure Trusted Signing or a vendor token) | Unsigned installers trigger SmartScreen warnings |
| macOS | Apple Developer Program membership, Developer ID Application certificate, notarisation (`APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`) | Membership lapse removes apps from distribution |
| Android | Upload keystore, Play App Signing enabled | Keep the keystore and passwords in a secrets vault, never in git |
| iOS | Same Apple membership, distribution certificate, provisioning profile, TestFlight | Requires macOS |

Publish under Ashmont's own developer accounts, not a personal one.

## CI

`.github/workflows/ashmont-studio.yml` runs on every change under `ashmont-studio/`:

- **web**: `npm ci`, `npm audit --audit-level=high`, typecheck, lint, unit tests, build, Playwright + axe.
- **rust**: clippy with and without `--features updater` (warnings fail), `cargo audit`.

A release workflow (tag → signed installers for three OSes) should be added once signing credentials exist; `tauri-apps/tauri-action` is the standard route.

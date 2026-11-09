# Test report

Run on 2026-11-09 (updated after the website data import), Linux x86_64, Node 22.23, Rust 1.97, Chromium 1243 (headless, SwiftShader WebGL).

## Results

| Suite | Command | Result |
|---|---|---|
| Type check (app + tests) | `npm run typecheck` | Pass |
| Lint | `npm run lint` | Pass (0 problems) |
| Unit and component tests (Vitest) | `npm test` | **113 passed**, 0 failed (11 files) |
| E2E + accessibility (Playwright + axe) | `npm run test:e2e` | **60 passed**, 0 failed, 4 skipped by design |
| Rust lint | `cargo clippy --all-targets -- -D warnings`, and again with `--features updater` | Pass |
| Release build, Linux | `npm run tauri build -- --bundles deb` | Pass: `Ashmont Studio_0.1.0_amd64.deb`, 12.3 MiB (2.97 MiB before the 9.6 MB of project images) |
| Desktop smoke test | packaged binary under Xvfb for 10 s | Launched, stayed alive, rendered the language picker under the strict CSP (`screenshots/linux-desktop-first-launch.png`) |
| `npm audit --audit-level=high` | | Pass. 9 **moderate** advisories, all in dev tooling (`minimatch` via eslint / typescript-eslint); nothing ships in the app. Recheck when eslint publishes a fix. |
| `cargo audit` | | Pass: 0 vulnerabilities in 497 crates. 5 warnings (unmaintained `proc-macro-error`, `zvariant`, `zbus_names`; unsound `glib 0.18` iterator) all come through Tauri's Linux GTK stack, not our code. Track Tauri upgrades. |

## What the tests cover

- **Feasibility engine**: IRR annualisation and the NPV-at-IRR identity; stage cost shares sum to 100%; spend reconciles to land + soft + hard; exit timing; equity-before-debt funding; debt repaid at exit; residual land value round trip (buying at it earns the target within 2 points); direction of every driver; stages never shorter than a month across 2,000 random draws; Monte Carlo determinism and P10 ≤ P50 ≤ P90; 1,000 runs under 400 ms. UI: results, risk and four charts with table views; input validation; programme switch; shared-link load; tampered links rejected; consultation prefill accepted when valid and ignored when not; Arabic.
- **Massing**: footprint × floors equals GFA for every programme; empty plot through design and permits; floors only grow and cladding never outruns structure across the whole timeline; complete with no crane after handover; text description and slider value text match the scene; 2D fallback without WebGL. E2E scrubs the 3D view with the keyboard and plays it. A regression stress test (15 repeats × 2 viewports) covers the URL-sync race on the hand-off to consultation: 30/30 with the fix, 14/30 failures without it.
- **Portfolio data**: 12 projects load; built-up areas sum to the CMS total; every project has Arabic copy and translated programme/scope; no award claims or construction dates; areas valid; images present; e2e checks no broken images.
- **Design tokens**: every text/background pair in light and dark themes meets WCAG 2.2 AA 4.5:1; focus ring ≥ 3:1. Also asserts raw brand gold fails as text, so nobody "simplifies" `accent-ink` away.
- **i18n**: Arabic and English key sets identical, placeholders match, no empty strings, no exclamation marks (brand voice), `<html dir>` flips correctly.
- **Consultation schema**: Saudi mobile normalisation (05…, 9665…, +966, 00966, Arabic-Indic digits), size with Arabic digits and separators, consent required, honeypot, control-character stripping, every error mapped to a translated message.
- **Submission**: HTTPS-only endpoint, payload contains only the minimum fields plus the consent record (timestamp, policy version, consent-text version), idempotency key, `credentials: omit`, offline short-circuit, client throttle, 429 and 5xx mapping, **nothing written to the console on failure**.
- **Components**: inline errors announced via `aria-describedby`, focus moves to the first invalid field, input modes and autofill, success and error-with-retry states, Arabic rendering, nav in both directions, project filter, published facts and hero image in English and Arabic, no-WebGL fallback, settings persistence, Insights empty state.
- **E2E (desktop 1280 px and Pixel 7)**: axe with WCAG 2.2 AA tags on 11 routes × 2 languages, zero serious or critical violations; language picker → RTL; project browsing; full consultation flow including consent gate; skip link is the first Tab stop.

## Performance measurements

| Budget | Measured | Notes |
|---|---|---|
| First meaningful paint < 2.5 s on 4G | **640 ms** headline visible | Chromium with network throttled to 9 Mbps / 170 ms RTT, served by `vite preview`. Desktop CPU, so treat as a lower bound; repeat on a mid-range phone. Inside Tauri the bundle is local, so network does not apply. |
| No leak after 20 open/close cycles of the 3D viewer | **+1.6 MB** JS heap after 20 cycles (threshold 8 MB) | Forced GC before and after; canvas count returns to 0 each time. GPU memory is not visible to this test. |
| Entry bundle | 144 KB gzip + 20 KB i18n chunk | 3D chunk (270 KB gzip) loads only when a viewer opens |
| 60 fps on a mid-range phone | **Not measured** | Needs real devices. `Stats` overlay is on in dev builds for frame-time profiling. |
| Feasibility studio recompute on input | **23 ms** | Base case + 1,000 Monte Carlo runs + sensitivity, Chromium, desktop CPU |
| 3D models < 8 MB | **Not applicable yet** | No client models supplied |

## Not run here

- Windows and macOS installers, Android APK/AAB, iOS: this machine has no Windows/macOS runner, Android SDK or Xcode. CI matrix and steps are in `build-and-release.md`.
- Tauri WebDriver desktop test (`tauri-driver`): replaced for now by the Xvfb launch smoke test above.
- GitHub Actions workflow: written, not yet executed on GitHub.

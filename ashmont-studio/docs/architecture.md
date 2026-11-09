# Architecture

## Shape

```
ashmont-studio/
├── src/                      React 19 + TypeScript (strict), bundled into the app
│   ├── app/                  shell: routes, layout (rail on desktop, bottom bar on phone), language gate
│   ├── design/               tokens.css (brand + semantic tokens), contrast checker, UI primitives
│   ├── i18n/                 i18next, ar + en locales, <html lang/dir> sync
│   ├── content/              portfolio (website JSON + curated Arabic layer) and studio stats
│   ├── assets/images/projects/  WebP renders synced from ashmont.com.sa
│   ├── lib/                  config, settings store, device tier, external links
│   └── features/<screen>/    home, projects (+ 3D viewer), services, insights, consultation, about, contact, settings
├── src-tauri/                Rust shell, capabilities, CSP, bundle config
├── e2e/                      Playwright flows + axe scans
└── public/draco/             Draco decoder, bundled so no script loads from a CDN
```

## Key decisions

| Decision | Why |
|---|---|
| **No custom Rust IPC commands** | Smallest attack surface. The webview needs nothing from Rust beyond the store and opener plugins. Add a command only with Rust-side argument validation and a scoped capability. |
| **HashRouter** | Works the same under `tauri://`, Android, iOS and a plain static host. Android hardware back walks webview history, which the hash router populates. |
| **Consultation goes straight to HTTPS** from the webview, constrained by CSP `connect-src` | The server is the trust boundary (validation, rate limits, bot checks). The client validates with Zod for UX only. |
| **Route-level code splitting**; three.js lazy-loaded only when the 3D viewer opens | Entry chunk ~144 KB gzip; the 270 KB gzip 3D chunk never loads for people who don't open a model. |
| **Zustand persisted to localStorage, preferences only** | Language, theme, reduced motion, data saver. Never personal data. Storage access is wrapped so private mode can't crash the app. |
| **TanStack Query `offlineFirst`** with a localStorage cache for Insights | Content survives weak networks; the feed is validated with Zod because it comes from outside the app. |
| **Semantic colour tokens over brand tokens** | Brand gold (#B2A05E) fails AA as text on cream (2.38:1), so text uses derived ink colours. A unit test re-checks every pair on each run. |

## Portfolio data

```
ashmont.com.sa/projects ──scripts/sync_website_projects.py──▶ src/content/projects.website.json   (generated)
                                                        └──▶ src/assets/images/projects/<slug>/  (hero 1600w, thumb 640w, up to 6 gallery 1280w, WebP q70)
src/content/projects.curated.ts (hand-written: Arabic copy, category, featured) ──┐
                                                                                  ├─▶ src/content/projects.ts → screens
src/content/projects.website.json ────────────────────────────────────────────────┘
```

- Re-run the sync whenever the website changes: `python3 -I scripts/sync_website_projects.py`. Tests then fail if a new project has no Arabic entry, or a new programme or scope value has no translation.
- The script skips construction dates and strips award sentences (see open items).
- Images are bundled, not hot-linked, so the portfolio works offline and the CSP stays `img-src 'self'`. Cost: about 9.6 MB, which takes the Linux installer from 3 MB to 12 MB. Thumbnails load eagerly only for the first three cards; everything else is `loading="lazy"`.
- Built-up areas sum to 121,522 m², matching the CMS export; a unit test pins this as a parsing check.

## Feasibility studio (`/studio`)

A client-facing development feasibility model. It began as a study of a browser tycoon game (monthly ticks, build stages, cash and debt, staff, random site events, cap-rate valuation). The engine was kept and made rigorous; the game layer was dropped because it does not fit a premium client app.

| Piece | File | What it does |
|---|---|---|
| Engine | `features/studio/engine.ts` | Pure, seeded, no DOM. Monthly cash flow from land (with transaction tax) through Ashmont's stages (pre-concept, concept, coordination, detailed design, permits, tender) and construction (foundation to handover, scaled by size), then lease-up, hold and exit at NOI / cap. Equity funds first, then debt; interest capitalises during construction. Outputs: yield on cost and spread, profit on cost, residual land value, project and equity IRR, NPV, equity multiple, DSCR, peak equity and debt. |
| Risk | `monteCarlo()` | 1,000 seeded runs drawing permit queries, labour shortages, material spikes, early inspections, rent drift and exit-cap noise. Reports P10/P50/P90 equity IRR, completion range, chance of hitting the target and chance of loss. |
| Sensitivity | `sensitivity()` | One-at-a-time swings (rent, cost, exit cap, delay, land, interest, occupancy), sorted by impact. |
| Inputs | `fields.ts` | One spec table drives the form, its validation, and the Zod schema that validates shared scenario links. |
| Charts | `charts.tsx` | Hand-built SVG: IRR histogram, equity J-curve, programme Gantt, tornado. One axis each, hover tooltips, a table view for every chart, LTR in both languages. Mark colours `--viz-1`/`--viz-2` were validated (lightness band, chroma, CVD, contrast) for both themes. |

- The scenario lives in the URL (`?s=`), so a client can bookmark or share it. It holds no personal data; links are length-capped and schema-validated.
- "Discuss this scenario" opens the consultation form pre-filled with project type and gross floor area (validated on arrival).
- Every default value is an **example assumption**, labelled as such on screen with a not-advice notice. The coordination effect (0.65× vs 1.4× event rate) is presented as the user's assumption, not as an Ashmont performance claim.
- Cost: 9 KB gzip chunk, loaded only on `/studio`. Full recompute (base + 1,000 runs + sensitivity) measured at 23 ms in Chromium, so results update while typing.

## Device tiers (3D)

`lib/device.ts` probes WebGL at startup:

- `none`: no WebGL. Static message, never a blank canvas.
- `low`: WebGL1 or a weak device. Shows "Explore in 3D"; loads the viewer on demand at DPR 1, no shadows, no AA.
- `high`: WebGL2, ≥4096 textures, ≥4 GB, ≥4 cores. Viewer loads directly at DPR up to 2 with shadows.

Data saver hides 3D and video regardless of tier. Reduced motion switches the canvas to `frameloop="demand"`.

The thresholds are a first guess. Calibrate on the real test devices (see open items).

## 3D viewer

`features/projects/ModelViewer.tsx` (React Three Fiber + drei):

- Orbit, pan, zoom (OrbitControls) plus keyboard-reachable buttons for rotate, zoom and reset.
- Section plane: a clipping plane driven by a native range input (keyboard-accessible).
- Three material presets (stone, timber, white model) and day/night lighting.
- GLB + Draco via `useGLTF(url, "/draco/")`, picking `models.high` or `models.low` by tier.
- The canvas has `role="img"` with a text description of the model.
- Disposal: materials created in the viewer are disposed on unmount; `useGLTF.clear` drops cached GLBs; R3F disposes the renderer. An e2e test opens and closes the viewer 23 times and checks JS heap growth stays under 8 MB (measured: 1.7 MB).
- The viewer is opt-in ("Explore in 3D") below the real photography. Until real models arrive it renders an **illustrative massing**, labelled "Illustrative massing, not a delivered design."

Not built yet: two-point measurement (needs real-world model units), LOD switching inside one model (needs the client's GLB files).

## CRM (Part 7b), not in this build

The CRM is a **separate staff app plus a Saudi-hosted backend**. Nothing CRM-related ships in this public binary, by design. Planned shape:

```
Public app ──HTTPS──▶ Consultation API (KSA) ──▶ PostgreSQL (KSA, RLS, field-level encryption)
                                                     ▲
Staff app (same design system, SSO + MFA) ──HTTPS────┘   append-only audit log, encrypted backups in-Kingdom
```

Build order once the client picks Option A or B: consultation API and schema first (it unblocks the public form), then the leads inbox, then pipeline, activities, reports, DSR export and erasure.

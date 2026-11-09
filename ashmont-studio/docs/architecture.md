# Architecture

## Shape

```
ashmont-studio/
├── src/                      React 19 + TypeScript (strict), bundled into the app
│   ├── app/                  shell: routes, layout (rail on desktop, bottom bar on phone), language gate
│   ├── design/               tokens.css (brand + semantic tokens), contrast checker, UI primitives
│   ├── i18n/                 i18next, ar + en locales, <html lang/dir> sync
│   ├── content/              portfolio entries and approved studio stats
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
- Until real models arrive it renders an **illustrative massing**, labelled "Illustrative massing, not a delivered design."

Not built yet: two-point measurement (needs real-world model units), LOD switching inside one model (needs the client's GLB files).

## CRM (Part 7b), not in this build

The CRM is a **separate staff app plus a Saudi-hosted backend**. Nothing CRM-related ships in this public binary, by design. Planned shape:

```
Public app ──HTTPS──▶ Consultation API (KSA) ──▶ PostgreSQL (KSA, RLS, field-level encryption)
                                                     ▲
Staff app (same design system, SSO + MFA) ──HTTPS────┘   append-only audit log, encrypted backups in-Kingdom
```

Build order once the client picks Option A or B: consultation API and schema first (it unblocks the public form), then the leads inbox, then pipeline, activities, reports, DSR export and erasure.

# Ashmont Studio

Client-facing app for Ashmont (architecture, interior design, engineering, Riyadh): portfolio with an interactive 3D viewer, services, insights and consultation requests. One codebase for Windows, macOS, Linux, Android and iOS, built with Tauri 2, React 19 and TypeScript.

Arabic (RTL) and English are both first-class.

## Start

```bash
npm ci
npm run tauri dev     # desktop
npm run dev           # browser only
npm run check         # typecheck, lint, unit tests, build
npm run build && npm run test:e2e
```

## Docs

- [Architecture](docs/architecture.md)
- [Security and PDPL checklist](docs/security.md)
- [Build and release](docs/build-and-release.md)
- [Test report](docs/test-report.md)
- [Open items for the client](docs/open-items.md)

## Ground rules

- Do not invent project data. Facts stay hidden until the client verifies them.
- No analytics or trackers. No remote scripts. No secrets in `VITE_*` variables.
- Gold is an accent: use the `accent-ink` token for gold text, raw `accent` only for rules and bars.
- Use logical CSS (`ms-`, `pe-`, `start-`, `border-e`) so layouts mirror in Arabic.

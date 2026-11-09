# Security and privacy

## Threat model (public app)

| Asset | Threat | Control in this build | Status |
|---|---|---|---|
| User's device | Malicious script in the webview reaching OS APIs | No custom IPC commands. Capability `default.json` grants only `core:default`, five `store:` calls and `opener:allow-open-url` scoped to `wa.me`, `ashmont.com.sa`, Google Maps, Instagram, LinkedIn, `tel:` and `mailto:`. No fs, shell, http or dialog plugins. `freezePrototype: true`. | Done |
| App code integrity | Remote code injection, CDN compromise | All JS bundled. CSP `script-src 'self' 'wasm-unsafe-eval'` (WASM is needed by the bundled Draco decoder), `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`. Draco decoder bundled in `public/draco`, not loaded from gstatic. | Done |
| Update channel | Malicious update | Tauri updater with minisign signature check. Compiled in only with `--features updater` so a build can't ship with an empty key. Private key stays in CI secrets. | Wiring done; keys and endpoint pending |
| Consultation data in transit | Interception, tampering | HTTPS-only endpoint (`parseEndpoint` rejects anything else). `credentials: "omit"`, `no-referrer`. CSP `connect-src` lists only the API and CDN origins. | Done (client side) |
| Consultation data at rest on device | Lost or shared device leaks leads | Nothing stored on device. Form state is cleared from memory after a successful send. Settings store holds preferences only. | Done |
| Consultation API | Spam, flooding, injection | Client: honeypot field, 30 s client-side throttle, idempotency key per submission, Zod validation, control-character stripping. **Server must re-validate everything, rate-limit per IP and per phone, add bot protection (for example Cloudflare Turnstile or hCaptcha), and dedupe on `Idempotency-Key`.** | Client done; server not built |
| Personal data in logs | PDPL breach via logs, crash reports | ESLint `no-console: error` in app code. A unit test asserts that a failed submission logs nothing. No analytics, no crash reporter. | Done |
| Secrets | Keys in the bundle | Only `VITE_CONSULTATION_ENDPOINT` (public URL) is read at build time. `.env*`, `*.key`, keystores are git-ignored. | Done |
| Supply chain | Vulnerable or hostile dependency | Exact versions in `package.json`, `package-lock.json` committed, `Cargo.lock` committed. CI runs `npm audit --audit-level=high` and `cargo audit` and fails the build. | Done (CI not yet run on GitHub) |

### CSP

Defined in `src-tauri/tauri.conf.json`. `style-src-attr 'unsafe-inline'` is allowed because Framer Motion animates through inline `style` attributes; this does not permit `<style>` elements or script. Bunny CDN host is a placeholder: `ashmont.b-cdn.net`. Replace it and `api.ashmont.com.sa` with the real hosts.

## PDPL checklist (consultation)

| Requirement | Where |
|---|---|
| Consent checkbox, not pre-ticked, required to send | `ConsultationPage.tsx`, `schema.ts` (`z.literal(true)`) |
| Consent stored with timestamp, policy version and consent-text version | `submit.ts` → `payload.consent` |
| Data minimisation: only project type, location, size, timeline, name, phone, email, optional message | `buildPayload` (test asserts no other keys) |
| Privacy notice in the app, linked from the form and from Settings | `/privacy` (**draft, needs legal review**) |
| No PII in logs | lint rule + unit test |
| No trackers or analytics | none installed; adding any must be opt-in |
| Data stays in KSA | **Open:** confirm the API and database are hosted in Saudi Arabia before enabling `VITE_CONSULTATION_ENDPOINT`. A foreign SaaS needs a documented transfer basis. |
| Data subject rights (access, correct, delete) | Notice gives info@ashmont.com.sa; DSR workflow lives in the CRM (not built) |
| Breach response plan | **Open:** write and approve before launch (owner, 72-hour notification path to SDAIA, user notification template) |
| Retention period for leads | **Open:** client to approve; enforce in the CRM |

NCA note: if Ashmont's systems fall under NCA Essential Cybersecurity Controls (for example as a supplier to a government entity), the backend hosting and logging need an ECC review too.

## Release blockers (security)

1. Real consultation endpoint with server-side validation, rate limiting and bot protection, hosted in KSA.
2. Updater key pair generated, public key in config, private key in CI secrets only.
3. Code signing: Windows certificate, Apple Developer ID + notarisation, Android upload keystore.
4. Legal review of the privacy notice and consent text.

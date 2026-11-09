# Open items for the client

Each item blocks a release unless marked otherwise.

| # | Item | Why it matters | Current placeholder |
|---|---|---|---|
| 1 | **Master brand colours** from Graphic Design | Cream, deep teal and gold were sampled from films | `src/design/tokens.css` (teal and taupe are from the site code) |
| 2 | **Brand typefaces** (Latin and Arabic) and font licences that allow app embedding | No typeface was confirmed; print uses Century Gothic, which is inconsistent with digital | System font stacks |
| 3 | **Logo master SVG** (wordmark with gold bar, Arabic lockup) and app icon | Current wordmark is a CSS approximation; icons are Tauri defaults | `Wordmark` in `src/design/ui.tsx`, `src-tauri/icons/` |
| 4 | **Correct WhatsApp number** | Site shows 966920019083 and 966508910500 | Official line 966920019083 |
| 5 | **Project facts** (area, units, role, status) per project, approved in writing | Facts are hidden until verified | All facts empty |
| 6 | **Project categories** for Al-Amri Resort, Al-Yasmin, Maison Novaire, Al-Wurud | Only Regent Park and Portal Hotel are labelled on the site | Inferred from names |
| 7 | **Arabic copy review** by a native copywriter | Arabic strings were written for this build, not translated word for word, but need brand sign-off | `src/i18n/locales/ar.json` |
| 8 | **Arabic project names** | Transliterations were drafted | `src/content/projects.ts` |
| 9 | **3D models**: GLB per project, real-world units, two LODs, Draco-compressed, under 8 MB default | Viewer currently shows an illustrative massing | `models: {}` |
| 10 | **Photography and hero video** with licences | Gallery and hero are placeholders | Line pattern |
| 11 | **Consultation endpoint** and confirmation it is hosted in KSA | Form cannot send until set | Disabled with a clear message |
| 12 | **Privacy notice and consent text**: legal review under PDPL | Draft text only | `privacy.body`, version `2026-11-draft-1` |
| 13 | **Retention period** for leads and **breach response plan** | PDPL | Not written |
| 14 | **Awards** (Regent Park) evidence on file | Brand rules allow them only with evidence | Not shown |
| 15 | **Bunny CDN host** and **API host** names | CSP must list exact hosts | `ashmont.b-cdn.net`, `api.ashmont.com.sa` |
| 16 | **CRM: build (Option A) or Zoho in KSA (Option B)** | Decides the backend and staff app scope | Not started |
| 17 | **Test devices** for the 60 fps budget (a named mid-range Android and iPhone) | Device-tier thresholds need calibration | Heuristic thresholds |
| 18 | **Developer accounts** (Apple, Google Play, Windows signing) in Ashmont's name | Distribution and signing | None |
| 19 | **Social links** (Instagram, LinkedIn handles) | Contact screen | Not shown; opener scope already allows both domains |

# Open items for the client

Each item blocks a release unless marked otherwise.

| # | Item | Why it matters | Current placeholder |
|---|---|---|---|
| 1 | **Master brand colours** from Graphic Design | Cream, deep teal and gold were sampled from films | `src/design/tokens.css` (teal and taupe are from the site code) |
| 2 | **Brand typefaces** (Latin and Arabic) and font licences that allow app embedding | No typeface was confirmed; print uses Century Gothic, which is inconsistent with digital | System font stacks |
| 3 | **Logo master SVG** (wordmark with gold bar, Arabic lockup) and app icon | Current wordmark is a CSS approximation; icons are Tauri defaults | `Wordmark` in `src/design/ui.tsx`, `src-tauri/icons/` |
| 4 | **Correct WhatsApp number** | Site shows 966920019083 and 966508910500 | Official line 966920019083 |
| 5 | **Sign-off on project data imported from ashmont.com.sa** (12 projects: programme, scope, built-up and land area, location, summaries, images) | It is Ashmont's own published data, so it is shown with an "As published on ashmont.com.sa" note, but the brief asked for client verification | Imported on 2026-11-09 by `scripts/sync_website_projects.py` |
| 6 | **Al-Amri Resort is labelled "Residential"** on the website although it is a resort; Olaya Tower (Residential / Retail) is filed under Mixed-use | Affects the project filter | Follows the website label; Olaya mapped to Mixed-use |
| 7 | **Arabic copy review** by a native copywriter | Arabic strings were written for this build, not translated word for word, but need brand sign-off | `src/i18n/locales/ar.json` |
| 8 | **Arabic project names and summaries** | The website is English only; Arabic was written for the app | `src/content/projects.curated.ts` |
| 9 | **3D models**: GLB per project, real-world units, two LODs, Draco-compressed, under 8 MB default | Viewer currently shows an illustrative massing | `models: {}` |
| 10 | **Hero video**, and confirmation of which website renders (if any) are AI-generated | Brand rules require AI images to be labelled; project renders are now bundled from the website | Home hero is still the line pattern |
| 11 | **Consultation endpoint** and confirmation it is hosted in KSA | Form cannot send until set | Disabled with a clear message |
| 12 | **Privacy notice and consent text**: legal review under PDPL | Draft text only | `privacy.body`, version `2026-11-draft-1` |
| 13 | **Retention period** for leads and **breach response plan** | PDPL | Not written |
| 14 | **Awards** (Regent Park) evidence on file | Brand rules allow them only with evidence | Not shown |
| 15 | **Bunny CDN host** and **API host** names | CSP must list exact hosts | `ashmont.b-cdn.net`, `api.ashmont.com.sa` |
| 16 | **CRM: build (Option A) or Zoho in KSA (Option B)** | Decides the backend and staff app scope | Not started |
| 17 | **Test devices** for the 60 fps budget (a named mid-range Android and iPhone) | Device-tier thresholds need calibration | Heuristic thresholds |
| 18 | **Developer accounts** (Apple, Google Play, Windows signing) in Ashmont's name | Distribution and signing | None |
| 19 | **Social links** (Instagram, LinkedIn handles) | Contact screen | Not shown; opener scope already allows both domains |
| 20 | **Postponed projects**: the project drive lists Al-Wurud, Olaya Tower, Al-Malqa, Al-Jazirah Heights and the Portal Chalets (Al-Qirawan, Al-Arid) as postponed, but the website shows them as live | Decide whether the app shows them as designs, hides them, or marks them | All 12 shown, no status shown |
| 21 | **Construction dates** were not imported | Several conflict with the drive (for example Al-Qirawan "2024" while postponed) | Not shown |
| 22 | **Regent Park awards** were stripped from the imported text | Brand rules: only with evidence on file | Not shown |
| 23 | **"24 projects delivered" and "22 team members"** on the home screen | The drive and the CMS show fewer delivered projects and the current staff list is smaller | Brand-guideline numbers shown; confirm or change to "projects designed" |

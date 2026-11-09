/**
 * Portfolio, built from two sources:
 *  - projects.website.json: generated from ashmont.com.sa by scripts/sync_website_projects.py
 *  - projects.curated.ts:   Arabic copy, categories and featured order, maintained by hand
 *
 * Only fields Ashmont publishes on its own site are shown. Construction dates and
 * award claims are deliberately not imported (see docs/open-items.md).
 */
import website from "./projects.website.json";
import { CURATED, FEATURED, PROGRAMME_AR, SERVICES_AR } from "./projects.curated";

export type ProjectCategory = "residential" | "hospitality" | "mixedUse";
type Bilingual = { en: string; ar: string };

export interface Project {
  slug: string;
  name: Bilingual;
  category: ProjectCategory;
  location: Bilingual;
  programme: Bilingual;
  services: Bilingual;
  /** m² */
  builtUpArea: number | null;
  /** m²; null for interior-only projects */
  landArea: number | null;
  summary: Bilingual;
  images: { hero: string; thumb: string; gallery: string[] };
  sourceUrl: string;
  /** GLB (Draco) URLs per LOD, bundled or on the Bunny CDN. Empty until real models arrive. */
  models: { low?: string; high?: string };
  /** Plain-language description of the 3D model, for screen readers. */
  modelDescription?: Bilingual;
}

// Vite turns each image into a hashed, bundled URL; nothing is fetched until rendered.
const IMAGES = import.meta.glob<string>("../assets/images/projects/*/*.webp", { eager: true, query: "?url", import: "default" });
const img = (slug: string, file: string) => {
  const url = IMAGES[`../assets/images/projects/${slug}/${file}`];
  if (!url) throw new Error(`Missing image ${slug}/${file}; run scripts/sync_website_projects.py`);
  return url;
};

export const WEBSITE_SYNCED_ON: string = website.syncedOn;

export const PROJECTS: Project[] = website.projects.map((w) => {
  const c = CURATED[w.slug];
  if (!c) throw new Error(`No curated entry for ${w.slug}; add it to projects.curated.ts`);
  return {
    slug: w.slug,
    name: { en: w.name, ar: c.nameAr },
    category: c.category,
    location: { en: w.location, ar: c.locationAr },
    programme: { en: w.programme, ar: PROGRAMME_AR[w.programme] ?? w.programme },
    services: { en: w.services, ar: SERVICES_AR[w.services] ?? w.services },
    builtUpArea: w.builtUpArea,
    landArea: w.landArea,
    summary: { en: c.summaryEn ?? w.summary, ar: c.summaryAr },
    images: { hero: img(w.slug, "hero.webp"), thumb: img(w.slug, "thumb.webp"), gallery: w.gallery.map((g) => img(w.slug, g)) },
    sourceUrl: w.sourceUrl,
    models: {},
  };
});

export const FEATURED_PROJECTS: Project[] = FEATURED.map((slug) => PROJECTS.find((p) => p.slug === slug)).filter((p): p is Project => Boolean(p));

export const findProject = (slug: string | undefined) => PROJECTS.find((p) => p.slug === slug);

/** Studio stats as approved in the Ashmont brand guidelines. Use exactly. */
export const STUDIO_STATS = [
  { key: "area", value: 152000 },
  { key: "projects", value: 24 },
  { key: "units", value: 415 },
  { key: "team", value: 22 },
] as const;

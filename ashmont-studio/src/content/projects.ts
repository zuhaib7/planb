/**
 * Portfolio entries. Names and types are as listed on ashmont.com.sa.
 * Facts (area, units, role, status) stay empty until the client verifies them;
 * the UI hides any fact with verified: false. Do not invent values.
 */
export type ProjectCategory = "residential" | "hospitality" | "mixedUse";

export interface ProjectFact {
  key: "area" | "units" | "role" | "status";
  value: { en: string; ar: string };
  verified: boolean;
}

export interface Project {
  slug: string;
  name: { en: string; ar: string };
  category: ProjectCategory;
  facts: ProjectFact[];
  /** GLB (Draco) URLs per LOD, bundled or on the Bunny CDN. Empty until real models arrive. */
  models: { low?: string; high?: string };
  /** Plain-language description of the 3D model, for screen readers. */
  modelDescription?: { en: string; ar: string };
}

export const PROJECTS: Project[] = [
  { slug: "regent-park", name: { en: "Regent Park", ar: "ريجنت بارك" }, category: "mixedUse", facts: [], models: {} },
  { slug: "al-amri-resort", name: { en: "Al-Amri Resort", ar: "منتجع العمري" }, category: "hospitality", facts: [], models: {} },
  { slug: "portal-hotel", name: { en: "Portal Hotel", ar: "فندق بورتال" }, category: "hospitality", facts: [], models: {} },
  { slug: "al-yasmin-residence", name: { en: "Al-Yasmin Residence", ar: "سكن الياسمين" }, category: "residential", facts: [], models: {} },
  { slug: "maison-novaire", name: { en: "Maison Novaire", ar: "ميزون نوفير" }, category: "residential", facts: [], models: {} },
  { slug: "al-wurud-residence", name: { en: "Al-Wurud Residence", ar: "سكن الورود" }, category: "residential", facts: [], models: {} },
];

/** OPEN ITEM: the site labels Regent Park (mixed-use) and Portal Hotel (hospitality); the other categories are inferred from the names. Confirm with the client. */

export const verifiedFacts = (p: Project) => p.facts.filter((f) => f.verified);
export const findProject = (slug: string | undefined) => PROJECTS.find((p) => p.slug === slug);

/** Studio stats as approved in the Ashmont brand guidelines. Use exactly. */
export const STUDIO_STATS = [
  { key: "area", value: 152000 },
  { key: "projects", value: 24 },
  { key: "units", value: 415 },
  { key: "team", value: 22 },
] as const;

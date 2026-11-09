import { describe, expect, it } from "vitest";
import website from "./projects.website.json";
import { CURATED, FEATURED, PROGRAMME_AR, SERVICES_AR } from "./projects.curated";
import { FEATURED_PROJECTS, PROJECTS } from "./projects";

describe("portfolio data from ashmont.com.sa", () => {
  it("loads all 12 published projects", () => {
    expect(PROJECTS).toHaveLength(12);
  });

  it("built-up areas sum to the CMS total (121,522 m²), an independent check on parsing", () => {
    expect(PROJECTS.reduce((s, p) => s + (p.builtUpArea ?? 0), 0)).toBe(121_522);
  });

  it("every website project has curated Arabic and every curated entry exists on the website", () => {
    expect(Object.keys(CURATED).sort()).toEqual(website.projects.map((p) => p.slug).sort());
  });

  it("every programme and scope value has an Arabic translation", () => {
    for (const p of website.projects) {
      expect([p.slug, PROGRAMME_AR[p.programme]]).not.toEqual([p.slug, undefined]);
      expect([p.slug, SERVICES_AR[p.services]]).not.toEqual([p.slug, undefined]);
    }
  });

  it("Arabic copy is Arabic and follows the brand voice", () => {
    for (const p of PROJECTS) {
      for (const s of [p.name.ar, p.summary.ar, p.location.ar]) expect([p.slug, /[؀-ۿ]/.test(s)]).toEqual([p.slug, true]);
      for (const s of [p.summary.en, p.summary.ar]) expect([p.slug, /[!！]/.test(s)]).toEqual([p.slug, false]);
    }
  });

  it("does not publish unverified award claims or construction dates", () => {
    for (const p of PROJECTS) {
      expect([p.slug, /award|top three|recogni[sz]ed/i.test(p.summary.en)]).toEqual([p.slug, false]);
      expect([p.slug, /جائزة|أفضل ثلاث/.test(p.summary.ar)]).toEqual([p.slug, false]);
    }
    for (const w of website.projects) expect(Object.keys(w)).not.toContain("constructionDate");
  });

  it("areas are positive whole numbers; land area may be absent only for interiors", () => {
    for (const p of PROJECTS) {
      expect(Number.isInteger(p.builtUpArea) && (p.builtUpArea ?? 0) > 0).toBe(true);
      if (p.landArea === null) expect(p.programme.en).toMatch(/Interior/);
    }
  });

  it("every project has a hero, thumbnail and at least one gallery image", () => {
    for (const p of PROJECTS) {
      expect(p.images.hero).toBeTruthy();
      expect(p.images.thumb).toBeTruthy();
      expect(p.images.gallery.length).toBeGreaterThan(0);
    }
  });

  it("featured projects all exist", () => {
    expect(FEATURED_PROJECTS.map((p) => p.slug)).toEqual([...FEATURED]);
  });

  it("slugs are unique and URL-safe", () => {
    const slugs = PROJECTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });
});

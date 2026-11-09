import type { Page } from "@playwright/test";

/** Skip the first-launch language picker by seeding preferences. */
export async function start(page: Page, lang: "en" | "ar" = "en", path = "/") {
  await page.addInitScript((l) => {
    localStorage.setItem("ashmont.settings.v1", JSON.stringify({ state: { language: l, languageChosen: true, theme: "system", reducedMotion: false, dataSaver: false }, version: 1 }));
  }, lang);
  await page.goto(`/#${path}`);
}

import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { start } from "./helpers";

const ROUTES = ["/", "/projects", "/projects/regent-park", "/services", "/insights", "/consultation", "/about", "/contact", "/settings", "/privacy"];

for (const lang of ["en", "ar"] as const) {
  for (const route of ROUTES) {
    test(`axe: no serious or critical violations on ${route} (${lang})`, async ({ page }) => {
      await start(page, lang, route);
      await expect(page.locator("main h1").first()).toBeVisible();
      await page.waitForTimeout(700); // let entrance motion settle so contrast is measured at rest
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
}

test("language picker on first launch, then RTL", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});

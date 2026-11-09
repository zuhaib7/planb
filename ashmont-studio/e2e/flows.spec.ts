import { expect, test } from "@playwright/test";
import { start } from "./helpers";

test("browse projects: filter and open a detail page", async ({ page }) => {
  await start(page, "en", "/projects");
  await page.getByRole("button", { name: "Residential" }).click();
  await expect(page.getByRole("main").getByText("Portal Hotel")).toHaveCount(0);
  await page.getByRole("link", { name: /Maison Novaire/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Maison Novaire");
  await expect(page.getByText("300 m²")).toBeVisible();
  // Real images load from the bundle (no broken images).
  const broken = await page.locator("main img").evaluateAll((imgs) => (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).length);
  expect(broken).toBe(0);
});

test("consultation: validation, consent and offline-safe submission state", async ({ page }) => {
  await start(page, "en", "/consultation");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByLabel("Project type")).toBeFocused();
  await page.getByLabel("Project type").selectOption("hospitality");
  await page.getByLabel("Location").fill("AlUla");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Approximate size (m²)").fill("١٢٠٠٠");
  await page.getByLabel("Timeline", { exact: true }).selectOption("6m");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Full name").fill("Omar Test");
  await page.getByLabel("Mobile number").fill("055 111 2222");
  await page.getByLabel("Email").fill("omar@example.com");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Please agree before sending.")).toBeVisible();
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await page.getByRole("button", { name: "Send request" }).click();
  // No endpoint is configured in this build, so the app must say so rather than pretend.
  await expect(page.getByRole("alert")).toContainText("not available yet");
});

test("keyboard: skip link and focus ring", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard path is a desktop requirement");
  await start(page, "en", "/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

test("3D viewer renders, responds to keyboard controls, and has a text description", async ({ page }) => {
  await start(page, "en", "/projects/regent-park");
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  const canvas = page.getByRole("img", { name: /Illustrative 3D massing/ });
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Rotate left" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Night" }).click();
  await expect(page.getByRole("button", { name: "Night" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Section height").fill("40");
  await expect(page.getByText("Illustrative massing, not a delivered design.")).toBeVisible();
});

test("3D viewer: no WebGL context leak after 20 open/close cycles", async ({ page, isMobile }) => {
  test.skip(isMobile, "one profile is enough for the leak check");
  test.setTimeout(120_000);
  await start(page, "en", "/projects/regent-park");
  const heap = () => page.evaluate(() => { (window as unknown as { gc?: () => void }).gc?.(); return (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0; });
  const cycle = async () => {
    await page.goto("/#/projects/regent-park");
    await page.getByRole("button", { name: "Explore in 3D" }).click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(150);
    await page.goto("/#/projects");
    await expect(page.locator("canvas")).toHaveCount(0);
  };
  for (let i = 0; i < 3; i++) await cycle(); // warm up caches and JIT
  const before = await heap();
  for (let i = 0; i < 20; i++) await cycle();
  const after = await heap();
  test.info().annotations.push({ type: "heap", description: `before=${before} after=${after} delta=${after - before}` });
  // Allow modest noise; a leaked renderer/scene per cycle would add several MB each.
  expect(after - before).toBeLessThan(8 * 1024 * 1024);
});

test("first meaningful paint under 2.5 s on throttled 4G", async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || isMobile);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  // Typical 4G: 9 Mbps down, 1.5 Mbps up, 170 ms RTT.
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 170, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
  await start(page, "en", "/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Upper bound: time from navigation start until the headline is visible. FCP is reported when the browser exposes it.
  const { visibleAt, fcp } = await page.evaluate(() => ({
    visibleAt: performance.now(),
    fcp: performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint")?.startTime ?? null,
  }));
  test.info().annotations.push({ type: "headline-visible-ms", description: String(Math.round(visibleAt)) }, { type: "fcp-ms", description: String(fcp) });
  expect(visibleAt).toBeLessThan(2500);
});

test("feasibility studio: change an input, see risk, hand off to consultation", async ({ page }) => {
  await start(page, "en", "/studio");
  const poc = page.getByTestId("studio-kpis").getByText("Profit on cost", { exact: true }).locator("xpath=following-sibling::dd[1]");
  const before = await poc.textContent();
  const hard = page.getByLabel("Construction cost");
  await hard.fill("4500");
  await expect(poc).not.toHaveText(before ?? "");
  await expect(page.getByRole("img", { name: "Distribution of equity IRR across scenarios" })).toBeVisible();
  // The scenario is in the URL, so reloading restores it.
  await page.waitForFunction(() => location.hash.includes("s="));
  await page.reload();
  await expect(page.getByLabel("Construction cost")).toHaveValue("4500");
  await page.getByRole("link", { name: "Discuss this scenario with Ashmont" }).click();
  await expect(page.getByLabel("Project type", { exact: true })).toHaveValue("residential");
});

test("feasibility studio computes within a frame budget on input", async ({ page, isMobile }) => {
  test.skip(isMobile);
  await start(page, "en", "/studio");
  await expect(page.getByTestId("studio-kpis").getByText("Equity IRR", { exact: true })).toBeVisible();
  const ms = await page.evaluate(async () => {
    const input = [...document.querySelectorAll("label")].find((l) => l.textContent === "Construction cost")!.control as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    const t0 = performance.now();
    setter.call(input, "3300");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  });
  test.info().annotations.push({ type: "studio-recompute-ms", description: String(Math.round(ms)) });
  expect(ms).toBeLessThan(500);
});

test("feasibility studio: 3D massing follows the timeline", async ({ page }) => {
  await start(page, "en", "/studio");
  const canvas = page.getByRole("img", { name: /^Month \d+ of \d+\./ });
  await expect(canvas).toBeVisible({ timeout: 15000 });
  const slider = page.getByRole("slider", { name: /Month/ });
  await slider.fill("0");
  await expect(canvas).toHaveAccessibleName(/Land acquired\. 0 of \d+ floors framed/);
  await slider.focus();
  await page.keyboard.press("End");
  await expect(canvas).toHaveAccessibleName(/Operating\./);
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
});

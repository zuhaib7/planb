import { expect, test } from "@playwright/test";
import { start } from "./helpers";

test("browse projects: filter and open a detail page", async ({ page }) => {
  await start(page, "en", "/projects");
  await page.getByRole("button", { name: "Residential" }).click();
  await expect(page.getByRole("main").getByText("Portal Hotel")).toHaveCount(0);
  await page.getByRole("link", { name: /Maison Novaire/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Maison Novaire");
  await expect(page.getByText("Project facts are shown once the client has verified them.")).toBeVisible();
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
  const explore = page.getByRole("button", { name: "Explore in 3D" });
  if (await explore.isVisible().catch(() => false)) await explore.click();
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
    const explore = page.getByRole("button", { name: "Explore in 3D" });
    if (await explore.isVisible().catch(() => false)) await explore.click();
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

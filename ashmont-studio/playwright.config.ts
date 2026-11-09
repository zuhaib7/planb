import { defineConfig, devices } from "@playwright/test";
import process from "node:process";

// CHROMIUM_PATH lets CI or sandboxes reuse a preinstalled browser.
const executablePath = process.env.CHROMIUM_PATH || undefined;
const launchOptions = { executablePath, args: ["--js-flags=--expose-gc", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"] };

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: [["list"], ["json", { outputFile: "test-results/e2e.json" }]],
  use: { baseURL: "http://localhost:4173", trace: "off" },
  webServer: { command: "npm run preview -- --port 4173 --strictPort", url: "http://localhost:4173", reuseExistingServer: !process.env.CI },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions } },
    { name: "phone", use: { ...devices["Pixel 7"], launchOptions } },
  ],
});

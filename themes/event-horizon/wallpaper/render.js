// Render the SVG wallpaper to PNG at common desktop sizes.
// Usage: node render.js   (needs Playwright + Chromium)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sizes = [
  [3840, 2160, '4k'],
  [2560, 1440, '1440p'],
  [1920, 1080, '1080p'],
  [3440, 1440, 'ultrawide'],
];

(async () => {
  const browser = await chromium.launch();
  for (const [w, h, name] of sizes) {
    const svg = execFileSync('python3', [path.join(__dirname, 'generate.py'), String(w), String(h)]).toString();
    if (name === '4k') fs.writeFileSync(path.join(__dirname, 'event-horizon.svg'), svg);
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);
    await page.screenshot({ path: path.join(__dirname, `event-horizon-${name}.png`) });
    await page.close();
    console.log('wrote', name);
  }
  await browser.close();
})();

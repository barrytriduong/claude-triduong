// Renders the SVG covers in /public to PNG, because social networks don't show SVG previews.
// Usage: node scripts/make-og-images.mjs   (needs Playwright + Chromium installed)
import { chromium } from 'playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const targets = [
  ['public', 'og-default.svg', 1200, 630],
  ...readdirSync('public/images/lessons').filter((f) => f.endsWith('.svg')).map((f) => ['public/images/lessons', f, 1280, 720]),
  ...readdirSync('public/images/blog').filter((f) => f.endsWith('.svg') && f !== 'forgetting-curve.svg').map((f) => ['public/images/blog', f, 1200, 675]),
];

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [dir, file, w, h] of targets) {
  await page.setViewportSize({ width: w, height: h });
  const svg = readFileSync(join(dir, file), 'utf8');
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}</body></html>`);
  await page.screenshot({ path: join(dir, file.replace('.svg', '.png')) });
  console.log('wrote', join(dir, file.replace('.svg', '.png')));
}
await browser.close();

'use strict';
// Renders the PNG brand assets from mark.svg, icon.html and og.html (dev-only; needs Playwright with Chromium,
// which is not a dependency of the app):   node tools/brand/render.js
const path = require('path');
const { chromium } = require('playwright');
const DIR = __dirname, PUB = path.join(__dirname, '..', '..', 'public');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const icon = async (file, size, { round = false, scale = '78%' } = {}) => {
    await page.setViewportSize({ width: 512, height: 512 });
    await page.goto('file://' + path.join(DIR, 'icon.html'));
    await page.evaluate(([r, s]) => { const b = document.getElementById('b'); b.classList.toggle('round', r); b.style.setProperty('--s', s); }, [round, scale]);
    await page.waitForLoadState('networkidle');
    const buf = await page.locator('#b').screenshot({ omitBackground: true });
    // Downscale in the browser for crisp small sizes
    const out = await page.evaluate(async ([b64, n]) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = n;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, n, n);
      return c.toDataURL('image/png').split(',')[1];
    }, [buf.toString('base64'), size]);
    require('fs').writeFileSync(path.join(PUB, file), Buffer.from(out, 'base64'));
    console.log(file, size);
  };
  await icon('icon-512.png', 512, { round: true });
  await icon('icon-192.png', 192, { round: true });
  await icon('icon-maskable-512.png', 512, { scale: '60%' }); // full-bleed, mark inside the maskable safe zone
  await icon('apple-touch-icon.png', 180);                   // iOS rounds the corners itself
  await icon('favicon.png', 64, { round: true, scale: '88%' });
  await icon('brand/logo.png', 192, { round: true });
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto('file://' + path.join(DIR, 'og.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.og').screenshot({ path: path.join(PUB, 'og.png') });
  console.log('og.png 1200x630');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

/**
 * Map LoansFlow UI at farm baseline 900x1600 for FamFlow/DabFlow-style sequences.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://loansflow.pages.dev';
const OUT = path.join(__dirname, '..', '..', 'docs', 'automation', 'loansflow_mapping.json');

async function box(page, selector) {
  const el = page.locator(selector).first();
  if (!(await el.count())) return null;
  const b = await el.boundingBox();
  if (!b) return null;
  return {
    x: Math.round(b.x + b.width / 2),
    y: Math.round(b.y + b.height / 2),
    w: Math.round(b.width),
    h: Math.round(b.height),
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 900, height: 1600 },
    deviceScaleFactor: 1,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  });

  const mapping = {
    source: BASE,
    base_w: 900,
    base_h: 1600,
    url: BASE + '/',
    mapped_at: new Date().toISOString(),
    screens: {},
  };

  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(__dirname, '..', '..', 'docs', 'automation', 'map-home.png'),
    fullPage: false,
  });

  mapping.screens.home = {
    brand: await box(page, '.hero-brand, .nav-brand'),
    cta_launch: await box(page, 'a.btn-primary, a.nav-cta'),
    cta_browse: await box(page, 'a.btn-ghost'),
    tools_section: await box(page, '#tools'),
    ad_top: await box(page, '.ad-slot'),
    tool_links: {},
  };

  const links = page.locator('.tool-link');
  const n = await links.count();
  for (let i = 0; i < n; i++) {
    const a = links.nth(i);
    const href = (await a.getAttribute('href')) || `tool_${i}`;
    const b = await a.boundingBox();
    const title = ((await a.locator('h3').innerText().catch(() => href)) || href).trim();
    if (b) {
      mapping.screens.home.tool_links[title] = {
        x: Math.round(b.x + b.width / 2),
        y: Math.round(b.y + b.height / 2),
        href,
      };
    }
  }

  // Scroll to tools for deeper coords
  await page.locator('#tools').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  mapping.screens.home_scrolled = {
    ad_top: await box(page, '.ad-slot'),
    tool_sba: await box(page, 'a.tool-link >> nth=0'),
    tool_mortgage: await box(page, 'a.tool-link >> nth=3'),
  };

  await page.goto(BASE + '/tools/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(__dirname, '..', '..', 'docs', 'automation', 'map-tools.png'),
    fullPage: false,
  });

  mapping.screens.tools = {
    brand_home: await box(page, '.brand a, .brand'),
    steps: {},
    primary_cta: await box(page, 'button.btn-primary'),
    ad_slots: [],
    anchor_ad: await box(page, '.ad-anchor .ad-slot'),
  };

  const steps = page.locator('.step');
  const sn = await steps.count();
  for (let i = 0; i < Math.min(sn, 9); i++) {
    const s = steps.nth(i);
    const label = ((await s.locator('.step-label').innerText().catch(() => `step${i}`)) || '').trim();
    const b = await s.boundingBox();
    if (b) {
      mapping.screens.tools.steps[label || `step_${i}`] = {
        index: i,
        x: Math.round(b.x + b.width / 2),
        y: Math.round(b.y + b.height / 2),
      };
    }
  }

  const ads = page.locator('.ad-slot');
  const an = await ads.count();
  for (let i = 0; i < an; i++) {
    const b = await ads.nth(i).boundingBox();
    if (b) {
      mapping.screens.tools.ad_slots.push({
        index: i,
        x: Math.round(b.x + b.width / 2),
        y: Math.round(b.y + b.height / 2),
        scrolls_before: i,
      });
    }
  }

  // Scroll tools page for in-content ads
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  mapping.screens.tools_scrolled = {
    ad_slots: [],
    primary_cta: await box(page, 'button.btn-primary'),
  };
  const ads2 = page.locator('.ad-slot');
  const an2 = await ads2.count();
  for (let i = 0; i < an2; i++) {
    const b = await ads2.nth(i).boundingBox();
    if (b && b.y > 0 && b.y < 1600) {
      mapping.screens.tools_scrolled.ad_slots.push({
        index: i,
        x: Math.round(b.x + b.width / 2),
        y: Math.round(b.y + b.height / 2),
      });
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(mapping, null, 2));
  console.log('WROTE', OUT);
  console.log(JSON.stringify(mapping.screens, null, 2).slice(0, 2500));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

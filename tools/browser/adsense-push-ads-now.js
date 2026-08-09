/**
 * Post-login AdSense push: ads.txt recheck, Auto ads by site, create display units.
 * Connects to Chrome CDP :9333 (AdSense profile).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PUB = 'pub-7523216981025331';
const HOST = 'loansflow.loan';
const TAG = 'adsense-push-2026-08-09';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dump(page, name) {
  const body = await page.locator('body').innerText().catch(() => '');
  fs.writeFileSync(path.join(OUT, `${TAG}-${name}.txt`), `${page.url()}\n\n${body.slice(0, 35000)}`);
  await page.screenshot({ path: path.join(OUT, `${TAG}-${name}.png`), fullPage: true }).catch(() => {});
  console.log(name, page.url());
  console.log(body.slice(0, 2400).replace(/\n/g, ' | '));
  return body;
}

async function clickFirst(page, locators, label) {
  for (const loc of locators) {
    const el = typeof loc === 'string' ? page.getByRole('button', { name: new RegExp(loc, 'i') }).first() : loc;
    if (await el.isVisible().catch(() => false)) {
      const dis = await el.getAttribute('aria-disabled').catch(() => null);
      console.log(label, 'visible', 'disabled=', dis);
      if (dis === 'true') continue;
      await el.click({ force: true }).catch(() => {});
      await sleep(2500);
      return true;
    }
  }
  console.log(label, 'not found');
  return false;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333', { timeout: 60000 });
  const page = await browser.contexts()[0].newPage();
  const result = { at: new Date().toISOString(), host: HOST };

  // --- Site detail: ads.txt + review ---
  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=${HOST}`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await sleep(6000);
  let body = await dump(page, '01-detail');
  result.detailSnip = body.slice(0, 1500);
  result.ownershipOk = /Verify site ownership/i.test(body) && /check_circle/i.test(body);
  result.reviewRequested = /Review requested/i.test(body);
  result.gettingReady = /Getting ready/i.test(body);
  result.ready = /\bReady\b/i.test(body) && !/Getting ready/i.test(body);

  // Expand ads.txt sections
  for (const t of [/ads\.txt/i, /Ads\.txt snippet/i, /Status details/i]) {
    await page.getByText(t).first().click({ force: true }).catch(() => {});
    await sleep(800);
  }

  await clickFirst(
    page,
    [
      page.getByRole('button', { name: /check again|re-?check|refresh|update status|verify ads\.txt/i }).first(),
      page.locator('button[aria-label*="refresh" i]').first(),
      page.locator('button[aria-label*="Reload" i]').first(),
    ],
    'adsTxtRefresh'
  );

  const placed = page.getByText(/i.?ve placed the code|i.?ve placed/i).first();
  if (await placed.isVisible().catch(() => false)) {
    await placed.click({ force: true });
    await sleep(1000);
  }
  await clickFirst(page, [page.getByRole('button', { name: /^verify$/i }).first()], 'verifyBtn');
  await sleep(4000);
  body = await dump(page, '02-detail-after-adstxt');

  await clickFirst(page, [page.getByRole('button', { name: /request review/i }).first()], 'requestReview');
  body = await dump(page, '03-after-review');

  // --- Auto ads (several known routes) ---
  const autoRoutes = [
    `https://adsense.google.com/adsense/u/0/${PUB}/optimization/autoads`,
    `https://adsense.google.com/adsense/u/0/${PUB}/ads/auto-ads`,
    `https://adsense.google.com/adsense/u/0/${PUB}/sites/autoAds?url=${HOST}`,
    `https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=${HOST}/autoads`,
  ];
  for (let i = 0; i < autoRoutes.length; i++) {
    await page.goto(autoRoutes[i], { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    await sleep(4500);
    body = await dump(page, `04-auto-${i}`);
    if (/Auto ads|Turn on Auto ads|by site|ad formats/i.test(body) && !/Getting your site ready/i.test(body)) {
      result.autoAdsUrl = page.url();
      break;
    }
  }

  // Prefer loansflow.loan in any site dropdown
  const siteDrop = page.getByText(/loansflow\.pages\.dev|loansflow\.loan|Select a site/i).first();
  if (await siteDrop.isVisible().catch(() => false)) {
    await siteDrop.click({ force: true }).catch(() => {});
    await sleep(1000);
    await page.getByText(/^loansflow\.loan$/i).first().click({ force: true }).catch(() => {});
    await sleep(2500);
    body = await dump(page, '05-site-selected');
  }

  // Flip Auto ads switches off → on
  const toggles = page.locator('[role="switch"], mat-slide-toggle button, button[aria-checked]');
  const n = await toggles.count();
  result.toggleCount = n;
  console.log('toggles', n);
  for (let i = 0; i < Math.min(n, 12); i++) {
    const el = toggles.nth(i);
    const checked = await el.getAttribute('aria-checked');
    console.log('toggle', i, checked);
    if (checked === 'false') {
      await el.click({ force: true }).catch(() => {});
      result.autoAdsFlipped = true;
      await sleep(800);
    }
  }
  await clickFirst(page, [/save|apply|confirm|allow ads/i], 'saveAuto');
  body = await dump(page, '06-auto-after');

  // --- Ad units ---
  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/ads/units`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  }).catch(() => {});
  await sleep(5000);
  body = await dump(page, '07-units');

  // New ad unit / Display ads
  const newUnit = page.getByRole('button', { name: /new ad unit|create ad unit|by ad unit/i }).first();
  if (await newUnit.isVisible().catch(() => false)) {
    await newUnit.click({ force: true });
    await sleep(3000);
    await dump(page, '08-new-unit');
  } else {
    await clickFirst(
      page,
      [
        page.getByRole('link', { name: /new ad unit|create/i }).first(),
        page.getByText(/Display ads|By ad unit/i).first(),
      ],
      'unitsEntry'
    );
    await sleep(3000);
    await dump(page, '08-units-entry');
  }

  // Try create Display + Multiplex named units if wizard open
  for (const name of ['LF Home Leaderboard', 'LF Mid Rectangle', 'LF Multiplex']) {
    const nameInput = page.locator('input[aria-label*="name" i], input[formcontrolname*="name" i], input[type="text"]').first();
    if (!(await nameInput.isVisible().catch(() => false))) break;
    await nameInput.fill(name).catch(() => {});
    await clickFirst(page, [/display ads|display/i], `pickDisplay-${name}`);
    await clickFirst(page, [/create|save|done|next/i], `create-${name}`);
    await sleep(2000);
    result.createdUnit = result.createdUnit || [];
    result.createdUnit.push(name);
  }
  body = await dump(page, '09-units-final');

  // --- Overview / Ads by site ---
  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/ads/overview`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  }).catch(() => {});
  await sleep(4000);
  body = await dump(page, '10-overview');

  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites/list`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(4000);
  body = await dump(page, '11-sites-final');
  result.sitesFinal = body.slice(0, 2500);
  result.adsTxtNotFound = /Not found/i.test(body);
  result.adsTxtAuthorized = /Authorized/i.test(body);

  fs.writeFileSync(path.join(OUT, `${TAG}-RESULT.json`), JSON.stringify(result, null, 2));
  console.log('RESULT', JSON.stringify(result, null, 2));
  console.log('DONE');
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});

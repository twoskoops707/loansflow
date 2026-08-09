/**
 * Open AdSense after email restored — sites, auto ads, create units if needed.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PASS = fs.readFileSync(path.join(OUT, '.secret-gmail-password.txt'), 'utf8').trim();
const PUB = 'pub-7523216981025331';
const HOST = 'loansflow.loan';
const TAG = 'adsense-go-live-2026-08-09';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dump(page, name) {
  const body = await page.locator('body').innerText().catch(() => '');
  fs.writeFileSync(path.join(OUT, `${TAG}-${name}.txt`), `${page.url()}\n\n${body.slice(0, 30000)}`);
  await page.screenshot({ path: path.join(OUT, `${TAG}-${name}.png`), fullPage: true }).catch(() => {});
  console.log(name, page.url());
  console.log(body.slice(0, 2000).replace(/\n/g, ' | '));
  return body;
}

async function loginIfNeeded(page) {
  const body = await page.locator('body').innerText().catch(() => '');
  const url = page.url();
  if (!/accounts\.google|Verify it.?s you|Sign in|Couldn't sign/i.test(url + body)) return false;

  const acct = page.getByText(/loansflow707@gmail\.com/i).first();
  if (await acct.isVisible().catch(() => false)) {
    await acct.click().catch(() => {});
    await sleep(2000);
  }
  const next = page.getByRole('button', { name: /^Next$/i }).first();
  if (await next.isVisible().catch(() => false)) {
    await next.click().catch(() => {});
    await sleep(3000);
  }
  const taw = page.getByText(/Try another way/i).first();
  if (await taw.isVisible().catch(() => false)) {
    await taw.click();
    await sleep(2000);
    const pw = page.getByText(/Enter your password/i).first();
    if (await pw.isVisible().catch(() => false)) await pw.click();
    await sleep(1500);
  }
  const pass = page.locator('input[type="password"], input[name="Passwd"]');
  if (await pass.first().isVisible().catch(() => false)) {
    await pass.first().fill(PASS);
    await page.getByRole('button', { name: /^Next$/i }).first().click();
    await sleep(8000);
    console.log('password ok');
    return true;
  }
  return false;
}

function siteRow(list, host) {
  const re = new RegExp(host.replace(/\./g, '\\.') + '[\\s\\S]{0,280}');
  const m = list.match(re);
  return m ? m[0].replace(/\n/g, ' | ') : '';
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333', { timeout: 60000 });
  const page = await browser.contexts()[0].newPage();
  const result = { at: new Date().toISOString(), pub: PUB };

  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites/list`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await sleep(5000);
  await loginIfNeeded(page);
  await sleep(3000);
  if (/accounts\.google|Verify|Couldn't/i.test(page.url())) {
    await loginIfNeeded(page);
  }

  let body = await dump(page, '01-sites');
  result.sites = {};
  for (const h of [HOST, 'loansflow.pages.dev', 'twoskoops707.github.io']) {
    const snip = siteRow(body, h);
    result.sites[h] = {
      snip,
      ready: /\bReady\b/i.test(snip) && !/Getting ready/i.test(snip),
      gettingReady: /Getting ready/i.test(snip),
      requiresReview: /Requires review/i.test(snip),
      adsTxt: /Authorized/i.test(snip)
        ? 'Authorized'
        : /Not found/i.test(snip)
          ? 'Not found'
          : 'unknown',
    };
  }

  // Site detail + request review if possible
  await page.goto(
    `https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=${HOST}`,
    { waitUntil: 'domcontentloaded', timeout: 120000 }
  );
  await sleep(5000);
  await loginIfNeeded(page);
  body = await dump(page, '02-detail');

  const review = page.getByRole('button', { name: /request review/i }).first();
  if (await review.isVisible().catch(() => false)) {
    const dis = await review.getAttribute('aria-disabled');
    result.reviewDisabled = dis;
    if (dis !== 'true') {
      await review.click({ force: true });
      console.log('CLICKED request review');
      await sleep(5000);
      await dump(page, '03-after-review');
    }
  }

  // Auto ads
  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/optimization/autoads`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  }).catch(() => {});
  await sleep(5000);
  body = await dump(page, '04-autoads');
  // Try enable toggles if off
  const toggles = page.locator('[role="switch"], mat-slide-toggle button, button[aria-checked]');
  const n = await toggles.count();
  console.log('toggles', n);
  for (let i = 0; i < Math.min(n, 8); i++) {
    const el = toggles.nth(i);
    const checked = await el.getAttribute('aria-checked');
    console.log('toggle', i, checked);
    if (checked === 'false') {
      await el.click().catch(() => {});
      result.autoAdsFlipped = true;
      await sleep(1000);
    }
  }
  const save = page.getByRole('button', { name: /save|apply|confirm/i }).first();
  if (await save.isVisible().catch(() => false)) {
    await save.click().catch(() => {});
    await sleep(3000);
  }
  await dump(page, '05-autoads-after');

  // By unit / ads overview
  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/ads/units`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  }).catch(() => {});
  await sleep(4000);
  await dump(page, '06-units');

  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/home`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await sleep(4000);
  body = await dump(page, '07-home');
  result.homeSnip = body.slice(0, 2000);

  fs.writeFileSync(path.join(OUT, `${TAG}-RESULT.json`), JSON.stringify(result, null, 2));
  console.log('RESULT', JSON.stringify(result.sites, null, 2));
  console.log('DONE');
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});

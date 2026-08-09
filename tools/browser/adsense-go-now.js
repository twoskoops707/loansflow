/**
 * Re-auth AdSense if needed; dump sites + detail + ads.txt refresh attempt.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PASS = fs.readFileSync(path.join(OUT, '.secret-gmail-password.txt'), 'utf8').trim();
const PUB = 'pub-7523216981025331';
const HOST = 'loansflow.loan';
const TAG = 'adsense-go-2026-08-09';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dump(page, name) {
  const body = await page.locator('body').innerText().catch(() => '');
  fs.writeFileSync(path.join(OUT, `${TAG}-${name}.txt`), `${page.url()}\n\n${body.slice(0, 30000)}`);
  await page.screenshot({ path: path.join(OUT, `${TAG}-${name}.png`), fullPage: true }).catch(() => {});
  console.log(name, page.url());
  console.log(body.slice(0, 1800).replace(/\n/g, ' | '));
  return body;
}

async function loginIfNeeded(page) {
  const body = await page.locator('body').innerText().catch(() => '');
  const url = page.url();
  if (!/accounts\.google|Verify it.?s you|Sign in/i.test(url + body)) return false;

  // Choose account
  const acct = page.getByText(/loansflow707@gmail\.com/i).first();
  if (await acct.isVisible().catch(() => false)) {
    await acct.click();
    await sleep(3000);
  }

  const next = page.getByRole('button', { name: /^Next$/i }).first();
  if (await next.isVisible().catch(() => false)) {
    await next.click().catch(() => {});
    await sleep(2500);
  }

  const pass = page.locator('input[type="password"], input[name="Passwd"]');
  if (await pass.first().isVisible().catch(() => false)) {
    await pass.first().fill(PASS);
    await page.getByRole('button', { name: /^Next$/i }).first().click();
    await sleep(8000);
    console.log('password submitted');
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333', { timeout: 60000 });
  const page = await browser.contexts()[0].newPage();

  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites/list`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await sleep(4000);
  await loginIfNeeded(page);
  await sleep(3000);
  if (/accounts\.google|Verify/i.test(page.url() + (await page.locator('body').innerText().catch(() => '')))) {
    await loginIfNeeded(page);
  }

  let body = await dump(page, 'sites');

  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=${HOST}`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await sleep(5000);
  await loginIfNeeded(page);
  await page.getByText(/Verify site ownership|ads\.txt|Getting ready|Review requested/i).first().click({ force: true }).catch(() => {});
  await sleep(1500);

  // Try ads.txt tab + verify
  await page.getByText(/^Ads\.txt snippet$/i).first().click({ force: true }).catch(() => {});
  await sleep(1500);
  const placed = page.getByText(/i.?ve placed/i).first();
  if (await placed.isVisible().catch(() => false)) {
    await placed.click({ force: true });
    await sleep(800);
  }
  const verify = page.getByRole('button', { name: /^verify$/i }).first();
  if (await verify.isVisible().catch(() => false)) {
    const dis = await verify.getAttribute('aria-disabled');
    console.log('verify disabled=', dis);
    if (dis !== 'true') {
      await verify.click({ force: true });
      await sleep(10000);
    }
  }
  body = await dump(page, 'detail');

  const review = page.getByRole('button', { name: /request review/i }).first();
  if (await review.isVisible().catch(() => false)) {
    const dis = await review.getAttribute('aria-disabled');
    console.log('review disabled=', dis);
    if (dis !== 'true') {
      await review.click({ force: true });
      console.log('CLICKED request review');
      await sleep(6000);
    }
  }

  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/payments/info`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await sleep(4000);
  await loginIfNeeded(page);
  await dump(page, 'payments');

  // Auto ads / optimization page
  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/optimization/autoads`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  }).catch(() => {});
  await sleep(4000);
  await dump(page, 'autoads');

  const result = {
    at: new Date().toISOString(),
    sites_snip: (fs.readFileSync(path.join(OUT, `${TAG}-sites.txt`), 'utf8') || '').slice(0, 4000),
  };
  fs.writeFileSync(path.join(OUT, `${TAG}-RESULT.json`), JSON.stringify(result, null, 2));
  console.log('DONE');
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});

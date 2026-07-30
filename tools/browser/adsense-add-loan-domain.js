/**
 * Add https://loansflow.loan in AdSense — dialog-aware fill + verify + review.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PUB = 'pub-7523216981025331';
const SITE = 'https://loansflow.loan';
const SITE_HOST = 'loansflow.loan';
const LIST = `https://adsense.google.com/adsense/u/0/${PUB}/sites/list`;
const DETAIL = `https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=${SITE_HOST}`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true }).catch(() => {});
  console.log('SHOT', name, page.url());
}
async function dump(page, name) {
  const body = await page.locator('body').innerText().catch(() => '');
  fs.writeFileSync(path.join(OUT, name), `${page.url()}\n\n${body.slice(0, 20000)}`);
  console.log(body.slice(0, 2000).replace(/\n/g, ' | '));
  return body;
}

async function fillWebsite(page, value) {
  // Prefer dialog / role=dialog inputs
  const candidates = [
    page.locator('[role="dialog"] input').first(),
    page.locator('mat-dialog-container input').first(),
    page.locator('.mat-mdc-dialog-container input').first(),
    page.getByRole('textbox', { name: /website|url|site/i }).first(),
    page.locator('input[formcontrolname*="url" i]').first(),
    page.locator('input[aria-label*="Website" i]').first(),
    page.locator('input[type="url"]').first(),
    page.locator('input[type="text"]').first(),
  ];
  for (const loc of candidates) {
    if (!(await loc.count().catch(() => 0))) continue;
    if (!(await loc.isVisible().catch(() => false))) continue;
    try {
      await loc.click({ timeout: 2000 });
      await loc.fill('');
      await loc.fill(value);
      const v = await loc.inputValue().catch(() => '');
      if (v.includes('loansflow')) {
        console.log('FILLED via', await loc.evaluate((el) => el.outerHTML.slice(0, 120)));
        return true;
      }
    } catch (e) {
      console.log('fill try fail', e.message.slice(0, 80));
    }
  }
  // Last resort: type into focused field
  await page.keyboard.type(value, { delay: 20 });
  console.log('TYPED fallback');
  return false;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333', { timeout: 120000 });
  const context = browser.contexts()[0];
  const page =
    context.pages().find((p) => p.url().includes('adsense.google.com')) ||
    (await context.newPage());
  await page.bringToFront().catch(() => {});

  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(4000);
  await shot(page, 'adsense-loan-r2-01-list.png');
  let body = await dump(page, 'adsense-loan-r2-01-list.txt');

  if (!new RegExp(SITE_HOST.replace('.', '\\.'), 'i').test(body)) {
    // Open New site if dialog not already open
    if (!/Add site/i.test(body) || !/Website/i.test(body)) {
      const newSite = page.getByRole('button', { name: /new site/i }).or(page.getByText(/^New site$/i));
      await newSite.first().click();
      await sleep(2500);
    }
    await shot(page, 'adsense-loan-r2-02-dialog.png');
    await dump(page, 'adsense-loan-r2-02-dialog.txt');

    // Dump inputs for debug
    const inputs = await page.locator('input').evaluateAll((els) =>
      els.map((el) => ({
        type: el.type,
        aria: el.getAttribute('aria-label'),
        name: el.name,
        ph: el.placeholder,
        visible: !!(el.offsetWidth || el.offsetHeight),
        fc: el.getAttribute('formcontrolname'),
      }))
    );
    console.log('INPUTS', JSON.stringify(inputs, null, 2));
    fs.writeFileSync(path.join(OUT, 'adsense-loan-r2-inputs.json'), JSON.stringify(inputs, null, 2));

    await fillWebsite(page, SITE);
    await sleep(800);
    await shot(page, 'adsense-loan-r2-03-filled.png');

    const save = page.getByRole('button', { name: /^save$/i });
    if (await save.first().isVisible().catch(() => false)) {
      const disabled = await save.first().isDisabled().catch(() => false);
      console.log('SAVE disabled?', disabled);
      if (!disabled) {
        await save.first().click();
        console.log('CLICKED Save');
        await sleep(6000);
      } else {
        await save.first().click({ force: true });
        await sleep(6000);
      }
    }
    await shot(page, 'adsense-loan-r2-04-after-save.png');
    body = await dump(page, 'adsense-loan-r2-04-after-save.txt');
  } else {
    console.log('already listed');
  }

  // Refresh list
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(4000);
  body = await dump(page, 'adsense-loan-r2-05-list.txt');
  await shot(page, 'adsense-loan-r2-05-list.png');

  if (!new RegExp(SITE_HOST.replace('.', '\\.'), 'i').test(body)) {
    console.log('SITE_NOT_ADDED — aborting verify');
    process.exit(2);
  }

  await page.goto(DETAIL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(5000);
  await shot(page, 'adsense-loan-r2-06-detail.png');
  body = await dump(page, 'adsense-loan-r2-06-detail.txt');

  const verifyHdr = page.getByText(/verify site ownership/i).first();
  if (await verifyHdr.isVisible().catch(() => false)) {
    await verifyHdr.click();
    await sleep(2000);
  }

  for (const label of [/^AdSense code snippet$/i, /^Ads\.txt snippet$/i, /meta tag/i]) {
    const t = page.getByText(label).first();
    if (await t.isVisible().catch(() => false)) {
      await t.click();
      await sleep(1200);
      console.log('TAB', label);
    }
  }

  const placed = page.getByText(/i.?ve placed the code/i).first();
  if (await placed.isVisible().catch(() => false)) {
    await placed.click().catch(() => {});
    await sleep(600);
  }

  const verifyBtn = page.getByRole('button', { name: /^verify$/i });
  if (await verifyBtn.first().isVisible().catch(() => false)) {
    const disabled = await verifyBtn.first().getAttribute('aria-disabled');
    console.log('verify aria-disabled=', disabled);
    if (disabled !== 'true') {
      await verifyBtn.first().click({ force: true }).catch(async () => verifyBtn.first().click());
      console.log('CLICKED Verify');
      await sleep(10000);
    }
  }
  await shot(page, 'adsense-loan-r2-07-after-verify.png');
  body = await dump(page, 'adsense-loan-r2-07-after-verify.txt');

  const review = page.getByRole('button', { name: /request review/i }).first();
  if (await review.isVisible().catch(() => false)) {
    const disabled = await review.getAttribute('aria-disabled');
    console.log('review aria-disabled=', disabled);
    if (disabled !== 'true') {
      await review.click({ force: true });
      console.log('CLICKED Request review');
      await sleep(5000);
    }
  }

  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(4000);
  await shot(page, 'adsense-loan-r2-08-final.png');
  await dump(page, 'adsense-loan-r2-08-final.txt');
  console.log('DONE_R2');
})().catch((e) => {
  console.error('FAIL', e.message || e);
  process.exit(1);
});

/**
 * Complete AdSense "Let's get you started" while session is live.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const SITE = 'https://loansflow.pages.dev/';
const EMAIL = 'loansflow707@gmail.com';

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  console.log('SHOT', name, page.url());
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  await page.goto(
    'https://adsense.google.com/adsense/signup/create?pli=1&sac=true&authuser=0',
    { waitUntil: 'domcontentloaded', timeout: 90000 }
  );
  await sleep(4000);
  await shot(page, 'adsense-fill-01.png');

  // If account chooser
  const chooser = page.getByText(EMAIL);
  if ((await page.url()).includes('accountchooser') || (await chooser.count())) {
    if (await chooser.first().isVisible().catch(() => false)) {
      await chooser.first().click();
      await sleep(4000);
    }
  }

  await shot(page, 'adsense-fill-02.png');
  let body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'adsense-fill-02.txt'), `${page.url()}\n\n${body.slice(0, 8000)}`);

  // Website field
  const siteInput = page.locator('input').filter({ hasText: '' }).first();
  // Prefer labeled website
  const byLabel = page.getByLabel(/website/i);
  if (await byLabel.count()) {
    await byLabel.first().fill(SITE);
    console.log('FILLED website via label');
  } else {
    const inputs = page.locator('input[type="text"], input[type="url"], input:not([type])');
    const n = await inputs.count();
    console.log('inputs', n);
    for (let i = 0; i < n; i++) {
      const el = inputs.nth(i);
      const aria = (await el.getAttribute('aria-label')) || '';
      const name = (await el.getAttribute('name')) || '';
      const ph = (await el.getAttribute('placeholder')) || '';
      console.log('input', i, { aria, name, ph });
      if (/site|url|web/i.test(aria + name + ph) || i === 0) {
        await el.fill(SITE);
        console.log('FILLED input', i);
        break;
      }
    }
  }

  // Help radios — pick Yes
  const yesHelp = page.getByText(/yes,? send me customized help/i);
  if (await yesHelp.first().isVisible().catch(() => false)) {
    await yesHelp.first().click();
    console.log('CLICKED help yes');
  }

  // Accept terms
  const accept = page.getByText(/i have read and accept the agreement/i);
  if (await accept.first().isVisible().catch(() => false)) {
    await accept.first().click();
    console.log('CLICKED accept');
    await sleep(1000);
  } else {
    const cb = page.locator('input[type="checkbox"]');
    const c = await cb.count();
    if (c) {
      await cb.nth(c - 1).check({ force: true }).catch(() => cb.nth(c - 1).click({ force: true }));
      console.log('CHECKED last checkbox');
    }
  }

  await sleep(2000);
  await shot(page, 'adsense-fill-03-before-submit.png');

  const start = page.getByRole('button', { name: /start using adsense/i });
  if (await start.first().isVisible().catch(() => false)) {
    const disabled = await start.first().isDisabled().catch(() => false);
    console.log('START disabled?', disabled);
    if (!disabled) {
      await start.first().click();
      console.log('CLICKED Start using AdSense');
      await sleep(8000);
    } else {
      // try force / wait for terms to load
      await sleep(5000);
      await start.first().click({ force: true });
      await sleep(8000);
    }
  }

  await shot(page, 'adsense-fill-04-after-submit.png');
  body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'adsense-fill-04.txt'), `${page.url()}\n\n${body.slice(0, 10000)}`);
  console.log('URL', page.url());
  console.log(body.slice(0, 900).replace(/\n/g, ' | '));

  // Ezoic with Google SSO if possible
  const p2 = await context.newPage();
  await p2.goto('https://pubdash.ezoic.com/signup', { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(async () => {
    await p2.goto('https://www.ezoic.com/web-publishers/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  });
  await sleep(3000);
  await shot(p2, 'ezoic-fill-01.png');
  const g = p2.getByRole('button', { name: /google/i }).or(p2.getByRole('link', { name: /google|sign up with google/i }));
  if (await g.first().isVisible().catch(() => false)) {
    await g.first().click();
    await sleep(6000);
  }
  await shot(p2, 'ezoic-fill-02.png');
  fs.writeFileSync(
    path.join(OUT, 'ezoic-fill-02.txt'),
    `${p2.url()}\n\n${(await p2.locator('body').innerText()).slice(0, 8000)}`
  );
  console.log('EZOIC', p2.url());

  console.log('DONE_FILL');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

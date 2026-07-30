/**
 * Drive AdSense onboarding: connect site + capture publisher ID wiring.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PUB = 'pub-7523216981025331';
const SITE = 'https://twoskoops707.github.io';
const ONBOARD = `https://adsense.google.com/adsense/u/0/${PUB}/onboarding`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  console.log('SHOT', name, page.url());
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  let page =
    context.pages().find((p) => p.url().includes(PUB) && p.url().includes('onboarding')) ||
    (await context.newPage());

  await page.goto(ONBOARD, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(4000);
  await shot(page, 'onboard-01.png');
  fs.writeFileSync(
    path.join(OUT, 'onboard-01.txt'),
    `${page.url()}\n\n${(await page.locator('body').innerText()).slice(0, 12000)}`
  );

  // Click Sites -> Let's go
  const sitesGo = page.getByRole('button', { name: /let'?s go/i }).or(page.getByText(/let'?s go/i));
  // Prefer the one under Sites section
  const allGo = page.locator('text=Let\'s go');
  console.log('lets go count', await allGo.count());
  if (await allGo.count()) {
    await allGo.first().click();
    console.log('CLICKED Let\'s go');
    await sleep(5000);
  }
  await shot(page, 'onboard-02-sites.png');
  let body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'onboard-02.txt'), `${page.url()}\n\n${body.slice(0, 12000)}`);
  console.log(body.slice(0, 1000).replace(/\n/g, ' | '));

  // Try add site / connect
  for (const name of [/add site/i, /connect/i, /get started/i, /continue/i, /next/i, /i'?m ready/i]) {
    const btn = page.getByRole('button', { name }).or(page.getByRole('link', { name }));
    if (await btn.first().isVisible().catch(() => false)) {
      console.log('CLICK', name);
      await btn.first().click();
      await sleep(4000);
      break;
    }
  }
  await shot(page, 'onboard-03.png');
  body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'onboard-03.txt'), `${page.url()}\n\n${body.slice(0, 12000)}`);
  console.log('URL3', page.url());
  console.log(body.slice(0, 1000).replace(/\n/g, ' | '));

  // Fill site URL if prompted
  const urlInput = page.getByLabel(/site|url|website/i).or(page.locator('input[type="url"], input[type="text"]'));
  if (await urlInput.first().isVisible().catch(() => false)) {
    await urlInput.first().fill(SITE);
    console.log('FILLED site', SITE);
    const save = page.getByRole('button', { name: /save|continue|next|add|submit/i });
    if (await save.first().isVisible().catch(() => false)) {
      await save.first().click();
      await sleep(5000);
    }
  }
  await shot(page, 'onboard-04.png');
  body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'onboard-04.txt'), `${page.url()}\n\n${body.slice(0, 12000)}`);
  console.log(body.slice(0, 1200).replace(/\n/g, ' | '));

  // Visit sites page directly
  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites/my-sites`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(4000);
  await shot(page, 'onboard-sites-page.png');
  body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'onboard-sites-page.txt'), `${page.url()}\n\n${body.slice(0, 12000)}`);
  console.log('SITES', page.url());
  console.log(body.slice(0, 1000).replace(/\n/g, ' | '));

  // Ads.txt snippet page often under site details
  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(4000);
  await shot(page, 'onboard-sites2.png');
  body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'onboard-sites2.txt'), `${page.url()}\n\n${body.slice(0, 12000)}`);
  console.log(body.slice(0, 1000).replace(/\n/g, ' | '));

  console.log('PUB', PUB);
  console.log('DONE_ONBOARD');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

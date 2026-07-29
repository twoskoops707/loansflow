const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const p = path.join(OUT, name);
  await page.screenshot({ path: p, fullPage: true });
  console.log('SHOT', p);
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  let page = context.pages().find((p) => p.url().includes('adsense') || p.url().includes('google.com'));
  if (!page) page = await context.newPage();

  console.log('URL', page.url());
  console.log('TITLE', await page.title());
  await shot(page, '01-adsense-start.png');

  // Prefer Get started / Sign in
  const candidates = [
    page.getByRole('link', { name: /get started/i }),
    page.getByRole('button', { name: /get started/i }),
    page.getByRole('link', { name: /sign in/i }),
    page.getByRole('button', { name: /sign in/i }),
    page.locator('a[href*="adsense"]').filter({ hasText: /start|sign/i }),
  ];

  for (const loc of candidates) {
    try {
      if (await loc.first().isVisible({ timeout: 1500 })) {
        const text = await loc.first().innerText();
        console.log('CLICK', text);
        await loc.first().click();
        await page.waitForTimeout(4000);
        break;
      }
    } catch (_) {}
  }

  console.log('URL2', page.url());
  console.log('TITLE2', await page.title());
  await shot(page, '02-after-start.png');

  // Collect visible text for debugging
  const body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, '02-body.txt'), body.slice(0, 8000));
  console.log('BODY_HEAD', body.slice(0, 500).replace(/\n/g, ' | '));

  // If account chooser
  const lf = page.getByText(/loansflow707@gmail\.com/i);
  if (await lf.count()) {
    console.log('SELECT loansflow707 account');
    await lf.first().click();
    await page.waitForTimeout(4000);
    await shot(page, '03-account.png');
  }

  console.log('URL3', page.url());
  await shot(page, '03-current.png');
  const body3 = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, '03-body.txt'), body3.slice(0, 10000));
  console.log('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

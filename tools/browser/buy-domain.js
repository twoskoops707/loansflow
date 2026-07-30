/**
 * Attempt to register loansflows.com via Porkbun (cheap .com) using Chrome CDP.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  // 1) Porkbun search
  await page.goto('https://porkbun.com/checkout/search?q=loansflows.com', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForTimeout(4000);
  await shot(page, 'domain-01-porkbun.png');
  let body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'domain-01-porkbun.txt'), body.slice(0, 8000));
  console.log('PORKBUN', page.url());
  console.log(body.slice(0, 600).replace(/\n/g, ' | '));

  // Click add to cart if available
  const add = page.getByRole('button', { name: /add|cart|register|buy/i }).or(
    page.locator('a,button').filter({ hasText: /add to cart|register|buy now/i })
  );
  if (await add.first().isVisible().catch(() => false)) {
    console.log('CLICK add');
    await add.first().click();
    await page.waitForTimeout(3000);
    await shot(page, 'domain-02-cart.png');
  }

  // 2) Also open Cloudflare registrar search as backup path
  const page2 = await context.newPage();
  await page2.goto('https://dash.cloudflare.com/?to=/:account/domains/register/loansflows.com', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page2.waitForTimeout(5000);
  await shot(page2, 'domain-10-cloudflare.png');
  const body2 = await page2.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'domain-10-cloudflare.txt'), `${page2.url()}\n\n${body2.slice(0, 8000)}`);
  console.log('CF', page2.url());
  console.log(body2.slice(0, 500).replace(/\n/g, ' | '));

  // 3) Namecheap search
  const page3 = await context.newPage();
  await page3.goto('https://www.namecheap.com/domains/registration/results/?domain=loansflows.com', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page3.waitForTimeout(5000);
  await shot(page3, 'domain-20-namecheap.png');
  const body3 = await page3.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'domain-20-namecheap.txt'), body3.slice(0, 8000));
  console.log('NC', page3.url());
  console.log(body3.slice(0, 500).replace(/\n/g, ' | '));

  console.log('DONE_DOMAIN_PROBE');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

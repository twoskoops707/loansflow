const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  console.log('SHOT', name, page.url());
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  let page = context.pages().find((p) => p.url().includes('porkbun')) || (await context.newPage());

  if (!page.url().includes('porkbun.com/checkout/search')) {
    await page.goto('https://porkbun.com/checkout/search?q=loansflows.com', {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await page.waitForTimeout(5000);
  }

  await shot(page, 'domain-40-before-checkout-btn.png');

  // Click green Checkout next to loansflows.com
  const checkoutBtn = page.getByRole('button', { name: /^checkout$/i }).or(
    page.locator('button,a').filter({ hasText: /^Checkout$/i })
  );
  const count = await checkoutBtn.count();
  console.log('checkout buttons', count);
  if (count) {
    await checkoutBtn.first().click();
    await page.waitForTimeout(5000);
  } else {
    // evaluate
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button,a'));
      const b = btns.find((el) => /^checkout$/i.test((el.textContent || '').trim()));
      if (b) b.click();
    });
    await page.waitForTimeout(5000);
  }

  await shot(page, 'domain-41-checkout-flow.png');
  let body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'domain-41-checkout-flow.txt'), `${page.url()}\n\n${body.slice(0, 10000)}`);
  console.log('URL', page.url());
  console.log(body.slice(0, 900).replace(/\n/g, ' | '));

  // If auth wall — try continue as guest / create account with loansflow707
  for (const name of [/continue as guest/i, /checkout as guest/i, /create account/i, /sign in/i]) {
    const el = page.getByRole('button', { name }).or(page.getByRole('link', { name }));
    if (await el.first().isVisible().catch(() => false)) {
      console.log('CLICK', name);
      await el.first().click();
      await page.waitForTimeout(3000);
      await shot(page, 'domain-42-auth.png');
      break;
    }
  }

  body = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'domain-42-state.txt'), `${page.url()}\n\n${body.slice(0, 10000)}`);
  console.log('STATE', page.url());
  console.log(body.slice(0, 900).replace(/\n/g, ' | '));
  console.log('DONE');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

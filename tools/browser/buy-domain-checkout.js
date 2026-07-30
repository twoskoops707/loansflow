/**
 * Add loansflows.com to Porkbun cart and attempt checkout.
 */
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
  const page = await context.newPage();

  await page.goto('https://porkbun.com/checkout/search?q=loansflows.com', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.waitForTimeout(8000);
  await shot(page, 'domain-30-porkbun-loaded.png');

  // Prefer clicking the .com price button near loansflows.com
  // Porkbun renders rows; try several strategies
  const strategies = [
    () => page.locator('tr,div,li').filter({ hasText: /^loansflows\.com$/ }).locator('button,a').first(),
    () => page.locator('[data-domain="loansflows.com"] button, [data-domain="loansflows.com"] a').first(),
    () => page.getByText('loansflows.com', { exact: true }).locator('xpath=ancestor::*[self::tr or self::div][1]//button').first(),
    () => page.locator('button,a').filter({ hasText: /\$\d/ }).first(),
  ];

  let clicked = false;
  for (const make of strategies) {
    try {
      const loc = make();
      if (await loc.isVisible({ timeout: 2000 })) {
        const t = await loc.innerText().catch(() => '');
        console.log('TRY CLICK', t);
        await loc.click({ timeout: 5000 });
        clicked = true;
        await page.waitForTimeout(3000);
        break;
      }
    } catch (e) {
      console.log('strategy fail', e.message.slice(0, 120));
    }
  }

  // Also try evaluating click on button next to loansflows.com text
  if (!clicked) {
    clicked = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('body *'));
      const label = nodes.find((n) => (n.childNodes.length && n.childNodes[0].nodeType === 3 && n.textContent.trim() === 'loansflows.com'));
      if (!label) return false;
      let row = label;
      for (let i = 0; i < 6 && row; i++) row = row.parentElement;
      const btn = row && row.querySelector('button, a.button, [role="button"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('EVAL CLICK', clicked);
    await page.waitForTimeout(3000);
  }

  await shot(page, 'domain-31-after-add.png');
  fs.writeFileSync(
    path.join(OUT, 'domain-31-after-add.txt'),
    `${page.url()}\n\n${(await page.locator('body').innerText()).slice(0, 6000)}`
  );

  // Go to cart / checkout
  const cart = page.getByRole('link', { name: /cart|checkout/i }).or(page.locator('a[href*="cart"], a[href*="checkout"]'));
  if (await cart.first().isVisible().catch(() => false)) {
    await cart.first().click();
    await page.waitForTimeout(4000);
  } else {
    await page.goto('https://porkbun.com/checkout', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
  }
  await shot(page, 'domain-32-checkout.png');
  const checkoutText = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, 'domain-32-checkout.txt'), `${page.url()}\n\n${checkoutText.slice(0, 8000)}`);
  console.log('CHECKOUT', page.url());
  console.log(checkoutText.slice(0, 700).replace(/\n/g, ' | '));

  // Sign in if needed
  if (/sign in|log in/i.test(checkoutText)) {
    const sign = page.getByRole('link', { name: /sign in/i }).or(page.getByRole('button', { name: /sign in/i }));
    if (await sign.first().isVisible().catch(() => false)) {
      await sign.first().click();
      await page.waitForTimeout(3000);
      await shot(page, 'domain-33-signin.png');
    }
  }

  console.log('DONE_BUY_ATTEMPT');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

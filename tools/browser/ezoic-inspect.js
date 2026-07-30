/**
 * Inspect current Ezoic pubdash setup page state via CDP.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.goto('https://pubdash.ezoic.com/setup', {
    waitUntil: 'networkidle',
    timeout: 90000,
  }).catch(() => {});
  await page.waitForTimeout(5000);

  const info = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input, select, textarea')].map((el) => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      value: el.value,
      visible: !!(el.offsetParent || el.getClientRects().length),
      disabled: el.disabled,
    }));
    const buttons = [...document.querySelectorAll('button, a, [role="button"]')].map((el) => ({
      text: (el.innerText || el.textContent || '').trim().slice(0, 80),
      disabled: el.disabled || el.getAttribute('aria-disabled'),
      href: el.href || null,
      classes: el.className,
    })).filter((b) => b.text);
    return {
      url: location.href,
      title: document.title,
      body: (document.body && document.body.innerText || '').slice(0, 8000),
      inputs,
      buttons: buttons.slice(0, 40),
    };
  });

  fs.writeFileSync(path.join(OUT, 'ezoic-inspect.json'), JSON.stringify(info, null, 2));
  await page.screenshot({ path: path.join(OUT, 'ezoic-inspect.png'), fullPage: true });
  console.log(JSON.stringify(info, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

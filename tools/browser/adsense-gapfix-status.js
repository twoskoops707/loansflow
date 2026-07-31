/**
 * Capture AdSense sites list + payments info status via Chrome CDP :9333.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PUB = 'pub-7523216981025331';
const TAG = 'adsense-gapfix-2026-07-31';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function rowSnippet(list, host) {
  const re = new RegExp(host.replace(/\./g, '\\.') + '[\\s\\S]{0,240}');
  const m = list.match(re);
  return m ? m[0].replace(/\n/g, ' | ') : '';
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const page = await browser.contexts()[0].newPage();
  const result = { at: new Date().toISOString(), sites: {}, payments: {} };

  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites/list`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await sleep(5000);
  const listBody = await page.locator('body').innerText();
  fs.writeFileSync(path.join(OUT, `${TAG}-sites-list.txt`), `${page.url()}\n\n${listBody.slice(0, 25000)}`);
  await page.screenshot({ path: path.join(OUT, `${TAG}-sites-list.png`), fullPage: true });

  for (const host of ['loansflow.loan', 'loansflow.pages.dev', 'twoskoops707.github.io']) {
    const snip = rowSnippet(listBody, host);
    result.sites[host] = {
      snippet: snip,
      adsTxt: /Authorized/i.test(snip)
        ? 'Authorized'
        : /Not found/i.test(snip)
          ? 'Not found'
          : /Unauthorized/i.test(snip)
            ? 'Unauthorized'
            : 'unknown',
      approval: /Getting ready/i.test(snip)
        ? 'Getting ready'
        : /\bReady\b/i.test(snip)
          ? 'Ready'
          : /Requires review/i.test(snip)
            ? 'Requires review'
            : 'unknown',
    };
  }

  // Try delete unused sites if still Not found (github.io / pages.dev) — only click delete if UI confirms
  // Safer: just report; do not auto-delete without confirmation in this run.
  result.sitesNote =
    'Public ads.txt is live on all three hosts. Leave sites attached; AdSense crawl lag expected. Do not delete until apex Ready unless you want less noise.';

  for (const pathUrl of [
    `https://adsense.google.com/adsense/u/0/${PUB}/payments/payments-info`,
    `https://adsense.google.com/adsense/u/0/${PUB}/payments/verification`,
  ]) {
    await page.goto(pathUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await sleep(6000);
    const body = await page.locator('body').innerText();
    const key = pathUrl.includes('verification') ? 'verification' : 'paymentsInfo';
    const name = `${TAG}-${key}`;
    fs.writeFileSync(path.join(OUT, `${name}.txt`), `${page.url()}\n\n${body.slice(0, 25000)}`);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
    result.payments[key] = {
      url: page.url(),
      hasForm: /name|address|tax|W-9|country|postal code|verification|identity/i.test(body),
      mentionsIncomplete: /incomplete|add|verify|required|get started|set up/i.test(body),
      snippet: body.replace(/\s+/g, ' ').slice(0, 1200),
    };
  }

  fs.writeFileSync(path.join(OUT, `${TAG}-RESULT.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await page.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

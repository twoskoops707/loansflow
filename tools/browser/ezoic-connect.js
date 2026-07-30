/**
 * Ezoic Connect Your Site: choose JS, capture instructions, check connection.
 * Does not select Cloudflare.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(OUT, { recursive: true });

async function dump(page, name) {
  const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 20000);
  const html = await page.content().catch(() => '');
  fs.writeFileSync(path.join(OUT, name + '.txt'), `${page.url()}\n\n${body}`);
  fs.writeFileSync(path.join(OUT, name + '.html'), html.slice(0, 200000));
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }).catch(() => {});
  console.log('DUMP', name, page.url());
  return body;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const page = await browser.contexts()[0].newPage();
  const result = { at: new Date().toISOString(), steps: [] };

  await page.goto('https://pubdash.ezoic.com/setup', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(4000);
  let body = await dump(page, 'ezoic-connect-01');

  // Click JavaScript card if needed
  if (/java\s*script/i.test(body)) {
    await page.getByText(/^JavaScript$/i).first().click().catch(() => {});
    result.steps.push('js_card');
    await sleep(1500);
  }

  if (await page.getByText(/VIEW INSTRUCTIONS/i).first().isVisible().catch(() => false)) {
    await page.getByText(/VIEW INSTRUCTIONS/i).first().click();
    result.steps.push('view_instructions');
    await sleep(4000);
    body = await dump(page, 'ezoic-connect-02-instructions');
  }

  // Extract any privacy/site IDs and script snippets from page HTML
  const extracted = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const html = document.documentElement.innerHTML || '';
    const ids = [...text.matchAll(/\b(\d{6,})\b/g)].map((m) => m[1]);
    const scripts = [...html.matchAll(/https?:\/\/[^"'<\s]+(?:ezo|gatekeeper|ezoic)[^"'<\s]*/gi)].map(
      (m) => m[0]
    );
    const codeBlocks = [...document.querySelectorAll('pre, code, textarea')].map((el) =>
      (el.innerText || el.value || '').slice(0, 2000)
    );
    return { ids: [...new Set(ids)].slice(0, 20), scripts: [...new Set(scripts)], codeBlocks, text: text.slice(0, 6000) };
  });
  result.extracted = extracted;
  fs.writeFileSync(path.join(OUT, 'ezoic-connect-EXTRACT.json'), JSON.stringify(extracted, null, 2));

  // Try CHECK CONNECTION (may fail until scripts live)
  if (await page.getByText(/CHECK CONNECTION/i).first().isVisible().catch(() => false)) {
    await page.getByText(/CHECK CONNECTION/i).first().click();
    result.steps.push('check_connection_clicked');
    await sleep(8000);
    body = await dump(page, 'ezoic-connect-03-check');
  }

  result.finalUrl = page.url();
  result.finalSnippet = body.slice(0, 4000);
  result.verdict = /detected|connected|review in progress|success/i.test(body)
    ? 'connection_ok_or_review'
    : /not detected|failed|try again|instructions/i.test(body)
      ? 'awaiting_script_deploy'
      : 'partial';

  fs.writeFileSync(path.join(OUT, 'ezoic-connect-RESULT.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

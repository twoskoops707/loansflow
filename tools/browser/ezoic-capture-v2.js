/**
 * Focused capture: open VIEW INSTRUCTIONS modal / docs and extract exact script HTML.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  await page.goto('https://pubdash.ezoic.com/setup', {
    waitUntil: 'networkidle',
    timeout: 120000,
  }).catch(async () => {
    await page.goto('https://pubdash.ezoic.com/setup', { waitUntil: 'domcontentloaded', timeout: 90000 });
  });
  await sleep(5000);

  // Dump frames
  const frameInfo = [];
  for (const f of page.frames()) {
    let t = '';
    try {
      t = await f.locator('body').innerText({ timeout: 2000 });
    } catch (_) {}
    frameInfo.push({ url: f.url(), text: (t || '').slice(0, 2000) });
  }
  fs.writeFileSync(path.join(OUT, 'ezoic-frames.json'), JSON.stringify(frameInfo, null, 2));
  console.log('frames', frameInfo.length, frameInfo.map((f) => f.url.slice(0, 80)));

  // Prefer proteus iframe if present
  let target = page;
  for (const f of page.frames()) {
    const t = frameInfo.find((x) => x.url === f.url());
    if (t && /VIEW INSTRUCTIONS|JavaScript|Connect Your Site/i.test(t.text)) {
      target = f;
      console.log('using frame', f.url());
      break;
    }
  }

  // Click VIEW INSTRUCTIONS inside target
  const beforePages = new Set(context.pages().map((p) => p));
  try {
    await target.getByText(/VIEW INSTRUCTIONS/i).first().click({ timeout: 8000 });
    console.log('clicked VIEW INSTRUCTIONS');
  } catch (e) {
    console.log('click fail', e.message);
    // evaluate click
    await target.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((e) =>
        /^VIEW INSTRUCTIONS$/i.test((e.textContent || '').trim())
      );
      if (el) el.click();
    });
  }
  await sleep(5000);

  // New pages?
  const newPages = context.pages().filter((p) => !beforePages.has(p));
  console.log('new pages', newPages.map((p) => p.url()));

  const result = { at: new Date().toISOString(), captures: [] };

  async function capture(label, scope) {
    const data = await scope.evaluate(() => {
      const text = document.body ? document.body.innerText || '' : '';
      const html = document.documentElement ? document.documentElement.outerHTML || '' : '';
      const codey = [...document.querySelectorAll('pre, code, textarea, .hljs, [class*="Code"]')]
        .map((el) => (el.innerText || el.value || '').trim())
        .filter(Boolean);
      const scriptTags = [...html.matchAll(/<script[\s\S]*?<\/script>/gi)].map((m) => m[0]).filter((s) =>
        /ezo|gatekeeper|ezstandalone|privacy/i.test(s)
      );
      const allScriptSrc = [...document.querySelectorAll('script[src]')].map((s) => s.src);
      // Look for copy-boxes that might not be pre/code
      const copyBoxes = [...document.querySelectorAll('div, span, p, li')]
        .map((el) => (el.innerText || '').trim())
        .filter((t) => /sa\.min\.js|gatekeeperconsent|ezstandalone|ezojs\.com/i.test(t) && t.length < 4000);
      return {
        text: text.slice(0, 15000),
        codey: codey.slice(0, 20),
        scriptTags: scriptTags.slice(0, 30),
        allScriptSrc: allScriptSrc.filter((u) => /ezo|gatekeeper/i.test(u)).slice(0, 20),
        copyBoxes: [...new Set(copyBoxes)].slice(0, 15),
        htmlHasSa: /sa\.min\.js/i.test(html),
        htmlHasPrivacy: /privacy\.js/i.test(html),
      };
    });
    result.captures.push({ label, url: scope.url ? scope.url() : page.url(), ...data });
    const safe = label.replace(/[^\w-]+/g, '_');
    fs.writeFileSync(path.join(OUT, `ezoic-cap-${safe}.txt`), `${scope.url ? scope.url() : page.url()}\n\n${data.text}`);
    await scope.screenshot({ path: path.join(OUT, `ezoic-cap-${safe}.png`), fullPage: true }).catch(() => {});
    console.log(
      'CAP',
      label,
      'codey',
      data.codey.length,
      'scripts',
      data.scriptTags.length,
      'copyBoxes',
      data.copyBoxes.length,
      'sa',
      data.htmlHasSa
    );
  }

  await capture('main', page);
  for (const f of page.frames()) {
    try {
      await capture('frame:' + f.url().slice(0, 60), f);
    } catch (_) {}
  }
  for (const p of newPages) {
    await sleep(2000);
    await capture('newpage', p);
  }

  // Also open official docs in a page and capture
  const docs = await context.newPage();
  await docs.goto('https://docs.ezoic.com/docs/ezoicads/getting-started/', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(4000);
  await capture('docs-getting-started', docs);

  await docs.goto('https://docs.ezoic.com/docs/ezoicads/integration/', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(4000);
  await capture('docs-integration', docs);

  // Search page for javascript header code
  const link = docs.locator('a, button').filter({ hasText: /javascript|header|standalone|integration/i });
  const n = await link.count().catch(() => 0);
  console.log('docs links matching', n);
  if (n) {
    await link.first().click().catch(() => {});
    await sleep(3000);
    await capture('docs-after-click', docs);
  }

  fs.writeFileSync(path.join(OUT, 'ezoic-cap-RESULT.json'), JSON.stringify(result, null, 2));
  console.log('DONE writes to', OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

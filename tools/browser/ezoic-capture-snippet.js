/**
 * Login to Ezoic pubdash if needed, open VIEW INSTRUCTIONS, capture exact JS snippet.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const EMAIL = 'loansflow707@gmail.com';
const PASS =
  (fs.existsSync(path.join(OUT, '.secret-ezoic-password.txt')) &&
    fs.readFileSync(path.join(OUT, '.secret-ezoic-password.txt'), 'utf8').trim()) ||
  'LoansFlow-Ez!2026Pub';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(OUT, { recursive: true });

async function dump(page, name) {
  const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 30000);
  const html = await page.content().catch(() => '');
  fs.writeFileSync(path.join(OUT, name + '.txt'), `${page.url()}\n\n${body}`);
  fs.writeFileSync(path.join(OUT, name + '.html'), html.slice(0, 400000));
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }).catch(() => {});
  console.log('DUMP', name, page.url(), body.slice(0, 160).replace(/\n/g, ' | '));
  return body;
}

async function extractSnippet(scope) {
  return scope.evaluate(() => {
    const text = document.body ? document.body.innerText || '' : '';
    const html = document.documentElement ? document.documentElement.innerHTML || '' : '';
    const codeBlocks = [...document.querySelectorAll('pre, code, textarea, [class*="code"], [class*="snippet"], [class*="instruction"]')]
      .map((el) => (el.innerText || el.value || '').trim())
      .filter((t) => t.length > 20);
    const dialogs = [...document.querySelectorAll('[role="dialog"], .modal, .MuiDialog-root, .modal-content, [class*="Modal"], [class*="Drawer"]')]
      .map((el) => (el.innerText || '').trim())
      .filter((t) => t.length > 20);
    const scriptsInText = [...text.matchAll(/<script[\s\S]*?<\/script>/gi)].map((m) => m[0]);
    const urls = [...html.matchAll(/https?:\/\/[^"'<\s]+(?:ezo|gatekeeper|ezoic|privacy)[^"'<\s]*/gi)].map(
      (m) => m[0]
    );
    const ids = [...new Set([...text.matchAll(/\b(\d{5,})\b/g)].map((m) => m[1]))].slice(0, 40);
    const siteIdHints = [...text.matchAll(/(?:site\s*id|domain\s*id|ezoic\s*id|ezid)\s*[:#]?\s*(\d+)/gi)].map(
      (m) => m[0]
    );
    return {
      text: text.slice(0, 12000),
      codeBlocks: codeBlocks.slice(0, 30),
      dialogs: dialogs.slice(0, 10),
      scriptsInText: scriptsInText.slice(0, 20),
      urls: [...new Set(urls)].slice(0, 40),
      ids,
      siteIdHints,
    };
  });
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  const result = { at: new Date().toISOString(), steps: [], passUsed: !!PASS };

  await page.goto('https://pubdash.ezoic.com/setup', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(4000);
  let body = await dump(page, 'ezoic-snip-01');

  if (/sign in|email:|password:/i.test(body) && /login\.ezoic/i.test(page.url() + body)) {
    result.steps.push('need_login');
    await page.goto('https://login.ezoic.com/?redirect_url=' + encodeURIComponent('https://pubdash.ezoic.com/setup'), {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await sleep(2500);
    await dump(page, 'ezoic-snip-login');
    const email = page.locator('input[type="email"], input[name="email"], input#email').first();
    const password = page.locator('input[type="password"]').first();
    if (await email.count()) {
      await email.fill(EMAIL);
      await password.fill(PASS);
      await page.getByRole('button', { name: /sign in/i }).click().catch(async () => {
        await page.locator('button[type="submit"]').first().click();
      });
      await sleep(6000);
      body = await dump(page, 'ezoic-snip-post-login');
      result.steps.push('logged_in');
    }
  }

  // Ensure on setup
  if (!/pubdash\.ezoic\.com\/setup/i.test(page.url())) {
    await page.goto('https://pubdash.ezoic.com/setup', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(4000);
    body = await dump(page, 'ezoic-snip-02-setup');
  }

  // Click JavaScript / VIEW INSTRUCTIONS — try page + frames
  async function clickText(re) {
    for (const scope of [page, ...page.frames()]) {
      try {
        const loc = scope.getByText(re).first();
        if (await loc.isVisible({ timeout: 800 }).catch(() => false)) {
          await loc.click({ timeout: 5000 });
          return scope;
        }
      } catch (_) {}
    }
    // fallback evaluate
    for (const scope of [page, ...page.frames()]) {
      try {
        const clicked = await scope.evaluate((pattern) => {
          const re2 = new RegExp(pattern, 'i');
          const els = [...document.querySelectorAll('a,button,div,span,p,li')];
          const el = els.find((e) => re2.test((e.innerText || '').trim()) && (e.innerText || '').trim().length < 80);
          if (el) {
            el.click();
            return (el.innerText || '').trim();
          }
          return null;
        }, re.source);
        if (clicked) return scope;
      } catch (_) {}
    }
    return null;
  }

  if (/java\s*script/i.test(body)) {
    await clickText(/^JavaScript$/);
    result.steps.push('js_card');
    await sleep(1500);
  }

  const instrScope = await clickText(/VIEW INSTRUCTIONS/i);
  result.steps.push(instrScope ? 'view_instructions_clicked' : 'view_instructions_miss');
  await sleep(3500);
  body = await dump(page, 'ezoic-snip-03-instructions');

  // Extract from page + all frames
  const extracts = [];
  for (const scope of [page, ...page.frames()]) {
    try {
      const ex = await extractSnippet(scope);
      extracts.push({ url: scope.url ? scope.url() : page.url(), ...ex });
    } catch (e) {
      extracts.push({ url: 'err', error: String(e) });
    }
  }
  result.extracts = extracts;

  // Also try "more details" / docs links
  const more = await clickText(/more details/i);
  if (more) {
    result.steps.push('more_details');
    await sleep(2500);
    await dump(page, 'ezoic-snip-04-more');
  }

  // Search for integration docs page in new tabs
  const pages = context.pages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const u = p.url();
    if (/ezoic|docs|instruction/i.test(u) && p !== page) {
      await dump(p, `ezoic-snip-tab-${i}`);
      try {
        extracts.push({ url: u, ...(await extractSnippet(p)) });
      } catch (_) {}
    }
  }

  // Pull site id from settings/domains if available
  await page.goto('https://pubdash.ezoic.com/settings/domains', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  }).catch(() => {});
  await sleep(4000);
  const domainsBody = await dump(page, 'ezoic-snip-05-domains');
  result.domainsSnippet = domainsBody.slice(0, 5000);

  await page.goto('https://pubdash.ezoic.com/ezoicads', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  }).catch(() => {});
  await sleep(3000);
  await dump(page, 'ezoic-snip-06-ezoicads');

  // Final setup check connection status
  await page.goto('https://pubdash.ezoic.com/setup', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(3000);
  if (await page.getByText(/CHECK CONNECTION/i).first().isVisible().catch(() => false)) {
    await page.getByText(/CHECK CONNECTION/i).first().click().catch(() => {});
    result.steps.push('check_connection');
    await sleep(8000);
  }
  body = await dump(page, 'ezoic-snip-07-check');
  result.finalBody = body.slice(0, 4000);
  result.verdict = /detected|connected|review in progress|success|integration found/i.test(body)
    ? 'connection_ok'
    : /additional time|not detected|failed|try again/i.test(body)
      ? 'awaiting'
      : 'unknown';

  fs.writeFileSync(path.join(OUT, 'ezoic-snip-RESULT.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ steps: result.steps, verdict: result.verdict, extractCount: extracts.length }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

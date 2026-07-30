/**
 * Strict AdSense ownership verify for a host (checkbox → Verify → Request review).
 * Usage: node adsense-strict-verify-host.js loansflow.pages.dev
 *        node adsense-strict-verify-host.js loansflow.loan
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PUB = 'pub-7523216981025331';
const HOST = process.argv[2] || 'loansflow.pages.dev';
const DETAIL = `https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=${HOST}`;
const LIST = `https://adsense.google.com/adsense/u/0/${PUB}/sites/list`;
const TAG = HOST.replace(/\./g, '-');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dump(page, name) {
  const body = await page.locator('body').innerText().catch(() => '');
  fs.writeFileSync(path.join(OUT, name), `${page.url()}\n\n${body.slice(0, 20000)}`);
  await page.screenshot({ path: path.join(OUT, name.replace('.txt', '.png')), fullPage: true }).catch(() => {});
  console.log('---', name);
  console.log(body.slice(0, 1800).replace(/\n/g, ' | '));
  return body;
}

function fetchText(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, body: d }));
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

async function provePublic(host) {
  const origin = `https://${host}`;
  const home = await fetchText(`${origin}/`);
  const ads = await fetchText(`${origin}/ads.txt`);
  const proof = {
    host,
    home_ok: home.ok,
    meta: !!(home.ok && /google-adsense-account/i.test(home.body) && /ca-pub-7523216981025331/.test(home.body)),
    script: !!(home.ok && /adsbygoogle\.js\?client=ca-pub-7523216981025331/.test(home.body)),
    ads_ok: !!(ads.ok && /pub-7523216981025331/.test(ads.body)),
    ads_body: ads.ok ? ads.body.trim() : ads.error,
    ready: false,
  };
  proof.ready = proof.home_ok && proof.meta && proof.script && proof.ads_ok;
  fs.writeFileSync(path.join(OUT, `adsense-strict-curl-${TAG}.json`), JSON.stringify(proof, null, 2));
  console.log('CURL_PROOF', JSON.stringify(proof));
  return proof;
}

async function checkPlaced(page) {
  // Prefer explicit label texts from AdSense UI
  const labels = [
    /i.?ve placed the html\s*<meta>\s*tag/i,
    /i.?ve placed the html/i,
    /i.?ve placed the (adsense )?code/i,
    /i.?ve placed the ads\.txt/i,
    /i.?ve placed/i,
  ];
  for (const re of labels) {
    const el = page.getByText(re).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click({ force: true });
      console.log('CLICKED_LABEL', String(re));
      await sleep(800);
    }
  }
  // Material checkbox roles
  const boxes = page.locator('[role="checkbox"], mat-checkbox, input[type="checkbox"]');
  const n = await boxes.count();
  console.log('CHECKBOX_COUNT', n);
  for (let i = 0; i < n; i++) {
    const b = boxes.nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    const checked =
      (await b.getAttribute('aria-checked').catch(() => null)) === 'true' ||
      (await b.isChecked().catch(() => false));
    console.log('BOX', i, { checked, aria: await b.getAttribute('aria-checked').catch(() => null) });
    if (!checked) {
      await b.click({ force: true });
      await sleep(500);
    }
  }
}

async function clickVerify(page) {
  const verify = page.getByRole('button', { name: /^verify$/i }).first();
  if (!(await verify.isVisible().catch(() => false))) {
    console.log('NO_VERIFY_BTN');
    return false;
  }
  // Wait up to 10s for enable
  for (let i = 0; i < 10; i++) {
    const aria = await verify.getAttribute('aria-disabled');
    const disabled = await verify.isDisabled().catch(() => false);
    console.log('VERIFY_STATE', i, { aria, disabled });
    if (aria !== 'true' && !disabled) break;
    await checkPlaced(page);
    await sleep(1000);
  }
  await verify.click({ force: true });
  console.log('CLICKED_VERIFY');
  await sleep(15000);
  return true;
}

async function tryMethod(page, method) {
  const hdr = page.getByText(/verify site ownership/i).first();
  if (await hdr.isVisible().catch(() => false)) {
    // ensure expanded
    const body0 = await page.locator('body').innerText();
    if (!/Meta tag|Ads\.txt snippet/i.test(body0)) {
      await hdr.click({ force: true });
      await sleep(2000);
    }
  }

  if (method === 'meta') {
    const tab = page.getByRole('tab', { name: /meta tag/i });
    if (await tab.count()) await tab.first().click({ force: true });
    else await page.locator('text=Meta tag').first().click({ force: true });
  } else if (method === 'adstxt') {
    const tab = page.getByRole('tab', { name: /ads\.txt/i });
    if (await tab.count()) await tab.first().click({ force: true });
    else await page.locator('text=Ads.txt snippet').first().click({ force: true });
  } else {
    const tab = page.getByRole('tab', { name: /adsense code/i });
    if (await tab.count()) await tab.first().click({ force: true });
    else await page.locator('text=AdSense code snippet').first().click({ force: true });
  }
  await sleep(2000);
  await dump(page, `adsense-strict-${TAG}-${method}-panel.txt`);

  await checkPlaced(page);
  await dump(page, `adsense-strict-${TAG}-${method}-checked.txt`);
  await clickVerify(page);
  const body = await dump(page, `adsense-strict-${TAG}-${method}-after.txt`);

  const failed = /couldn.?t verify|unable to verify|we couldn.?t find|verification failed|try again/i.test(body);
  const stillUnchecked = /check_box_outline_blank/i.test(body) && /i.?ve placed/i.test(body);
  const ownershipGone = !/i.?ve placed/i.test(body) && !/Select verification method/i.test(body);
  const gettingReady = /Getting ready/i.test(body) && !/Requires review/i.test(body.split(HOST)[1] || '');
  // Parse site chip status near host name at top
  const chip = body.match(new RegExp(HOST.replace(/\./g, '\\.') + '\\s*\\n\\s*(Requires review|Getting ready|Ready|Needs attention)', 'i'));
  console.log('STATUS_CHIP', chip && chip[1]);
  console.log('FLAGS', { failed, stillUnchecked, ownershipGone, gettingReady });

  if (failed) return { ok: false, reason: 'verify_rejected', body };
  if (chip && /Getting ready|Ready/i.test(chip[1])) return { ok: true, status: chip[1], method };
  if (ownershipGone) return { ok: true, status: 'ownership_ui_cleared', method };
  return { ok: false, reason: 'still_pending', status: chip && chip[1], body };
}

(async () => {
  const proof = await provePublic(HOST);
  if (!proof.ready) {
    const out = { host: HOST, verified: false, blocked: 'PUBLIC_NOT_READY', proof, at: new Date().toISOString() };
    fs.writeFileSync(path.join(OUT, `adsense-strict-result-${TAG}.json`), JSON.stringify(out, null, 2));
    console.log('RESULT', JSON.stringify(out, null, 2));
    // Still attempt for apex evidence if listed
  }

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333', { timeout: 120000 });
  const context = browser.contexts()[0];
  let page = context.pages().find((p) => /adsense\.google\.com/.test(p.url()));
  if (!page) page = await context.newPage();
  await page.bringToFront().catch(() => {});

  await page.goto(DETAIL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(5000);
  await dump(page, `adsense-strict-${TAG}-detail.txt`);

  let result = { ok: false };
  for (const method of ['meta', 'adstxt', 'code']) {
    console.log('TRY_METHOD', method);
    result = await tryMethod(page, method);
    if (result.ok) break;
    // re-open detail if navigated away
    if (!page.url().includes(`url=${HOST}`)) {
      await page.goto(DETAIL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await sleep(4000);
    }
  }

  // Request review if enabled
  let review = false;
  const reviewBtn = page.getByRole('button', { name: /request review/i }).first();
  if (await reviewBtn.isVisible().catch(() => false)) {
    const aria = await reviewBtn.getAttribute('aria-disabled');
    console.log('REVIEW_ARIA', aria);
    if (aria !== 'true' && !(await reviewBtn.isDisabled().catch(() => false))) {
      await reviewBtn.click({ force: true });
      review = true;
      console.log('CLICKED_REVIEW');
      await sleep(8000);
      await dump(page, `adsense-strict-${TAG}-review.txt`);
    }
  }

  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(4000);
  const listBody = await dump(page, `adsense-strict-${TAG}-list.txt`);
  const row = listBody.match(new RegExp(HOST.replace(/\./g, '\\.') + '[\\s\\S]{0,180}', 'i'));

  const out = {
    host: HOST,
    public_ready: proof.ready,
    proof,
    verified: !!result.ok,
    verify_detail: result,
    review_requested: review,
    list_row: row ? row[0] : null,
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, `adsense-strict-result-${TAG}.json`), JSON.stringify(out, null, 2));
  console.log('RESULT', JSON.stringify(out, null, 2));
  console.log('DONE');
  process.exit(result.ok ? 0 : 2);
})().catch((e) => {
  console.error('FAIL', e.message || e);
  process.exit(1);
});

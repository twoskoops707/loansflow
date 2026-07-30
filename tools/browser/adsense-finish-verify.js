/**
 * Finish AdSense ownership verify for loansflow707.
 * Path A: loansflow.loan if HTTPS public
 * Path B (interim): loansflow.pages.dev if apex blocked — still keep .loan listed
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const SECRET = path.join(OUT, '.secret-gmail-password.txt');
const PUB = 'pub-7523216981025331';
const EMAIL = 'loansflow707@gmail.com';
const LIST = `https://adsense.google.com/adsense/u/0/${PUB}/sites/list`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true }).catch(() => {});
  console.log('SHOT', name);
}
async function dump(page, name) {
  const body = await page.locator('body').innerText().catch(() => '');
  fs.writeFileSync(path.join(OUT, name), `${page.url()}\n\n${body.slice(0, 25000)}`);
  console.log(body.slice(0, 1600).replace(/\n/g, ' | '));
  return body;
}

function fetchText(url) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 LoansFlowVerify/1' } },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () =>
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, body: d })
        );
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

function adsenseReady(home, ads) {
  const hasMeta =
    home.ok &&
    /name=["']google-adsense-account["']/i.test(home.body) &&
    /ca-pub-7523216981025331/.test(home.body) &&
    /adsbygoogle\.js\?client=ca-pub-7523216981025331/.test(home.body);
  const hasAds = ads.ok && /pub-7523216981025331/.test(ads.body) && /DIRECT/i.test(ads.body);
  return {
    home_ok: home.ok,
    home_status: home.status || null,
    home_err: home.error || null,
    has_meta_script: !!hasMeta,
    ads_ok: !!hasAds,
    ads_body: ads.ok ? ads.body.trim().slice(0, 160) : ads.error || null,
    ready: !!(hasMeta && hasAds),
  };
}

async function ensureSession(page) {
  await page.goto(
    `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(EMAIL)}&continue=${encodeURIComponent(LIST)}`,
    { waitUntil: 'domcontentloaded', timeout: 120000 }
  );
  await sleep(3000);
  const pick = page.getByText(EMAIL, { exact: false });
  if (await pick.first().isVisible().catch(() => false)) {
    await pick.first().click();
    await sleep(4000);
  }
  const emailBox = page.locator('input[type="email"], input[name="identifier"]');
  if (await emailBox.count()) {
    await emailBox.first().fill(EMAIL);
    await page.getByRole('button', { name: /next/i }).click();
    await sleep(3500);
  }
  const pass = page.locator('input[type="password"], input[name="Passwd"]');
  if (await pass.count()) {
    const pw = fs.existsSync(SECRET) ? fs.readFileSync(SECRET, 'utf8').trim() : '';
    if (!pw) throw new Error('NEED_PASSWORD');
    await pass.first().fill(pw);
    await page.getByRole('button', { name: /next/i }).click();
    await sleep(7000);
  }
  const body = await page.locator('body').innerText().catch(() => '');
  await shot(page, 'adsense-fin-session.png');
  fs.writeFileSync(path.join(OUT, 'adsense-fin-session.txt'), `${page.url()}\n\n${body.slice(0, 6000)}`);
  if (/2-step|authenticator|verification code|verify it.?s you|enter the code|captcha/i.test(body)) {
    fs.writeFileSync(path.join(OUT, 'BLOCKED-2FA-loan.txt'), body.slice(0, 5000));
    throw new Error('2FA_OR_CAPTCHA');
  }
  if (!page.url().includes('adsense.google.com')) {
    await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await sleep(4000);
  }
}

async function addSiteIfMissing(page, host, url) {
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(4000);
  let body = await dump(page, `adsense-fin-list-before-${host.replace(/\./g, '-')}.txt`);
  await shot(page, `adsense-fin-list-before-${host.replace(/\./g, '-')}.png`);
  if (new RegExp(host.replace(/\./g, '\\.'), 'i').test(body)) {
    console.log('LISTED', host);
    return true;
  }
  console.log('ADD', url);
  await page.getByRole('button', { name: /new site/i }).first().click();
  await sleep(2500);
  const input = page.locator('input[aria-label="Website"]').first();
  await input.click();
  await input.fill(url);
  const save = page.getByRole('button', { name: /^save$/i }).first();
  await sleep(500);
  const disabled = await save.isDisabled().catch(() => false);
  console.log('SAVE_DISABLED', disabled);
  await save.click({ force: true });
  await sleep(7000);
  await shot(page, `adsense-fin-after-add-${host.replace(/\./g, '-')}.png`);
  body = await dump(page, `adsense-fin-after-add-${host.replace(/\./g, '-')}.txt`);
  // maybe still on dialog with error
  if (/not supported|invalid|can't be added|cannot be added|pages\.dev/i.test(body) && !new RegExp(host.replace(/\./g, '\\.'), 'i').test(body)) {
    console.log('ADD_REJECTED', host);
    const cancel = page.getByRole('button', { name: /cancel/i }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
    return false;
  }
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(4000);
  body = await dump(page, `adsense-fin-list-after-${host.replace(/\./g, '-')}.txt`);
  return new RegExp(host.replace(/\./g, '\\.'), 'i').test(body);
}

async function verifyHost(page, host) {
  const detail = `https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=${host}`;
  await page.goto(detail, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(5000);
  await shot(page, `adsense-fin-detail-${host.replace(/\./g, '-')}.png`);
  let body = await dump(page, `adsense-fin-detail-${host.replace(/\./g, '-')}.txt`);

  const hdr = page.getByText(/verify site ownership/i).first();
  if (await hdr.isVisible().catch(() => false)) {
    await hdr.click();
    await sleep(1500);
  }

  for (const [key, re] of [
    ['meta', /^Meta tag$/i],
    ['adstxt', /^Ads\.txt snippet$/i],
    ['code', /^AdSense code snippet$/i],
  ]) {
    let tab = page.getByText(re).first();
    if (!(await tab.isVisible().catch(() => false))) {
      if (await hdr.isVisible().catch(() => false)) await hdr.click().catch(() => {});
      await sleep(800);
      tab = page.getByText(re).first();
    }
    if (!(await tab.isVisible().catch(() => false))) {
      console.log('NO_TAB', host, key);
      continue;
    }
    await tab.click();
    await sleep(1000);
    const placed = page.getByText(/i.?ve placed the code/i).first();
    if (await placed.isVisible().catch(() => false)) await placed.click().catch(() => {});
    const boxes = page.locator('mat-checkbox, input[type="checkbox"]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) {
      const b = boxes.nth(i);
      if (await b.isVisible().catch(() => false)) await b.click({ force: true }).catch(() => {});
    }
    const verifyBtn = page.getByRole('button', { name: /^verify$/i }).first();
    if (!(await verifyBtn.isVisible().catch(() => false))) continue;
    const aria = await verifyBtn.getAttribute('aria-disabled');
    if (aria === 'true' || (await verifyBtn.isDisabled().catch(() => false))) continue;
    await verifyBtn.click({ force: true });
    console.log('VERIFY_CLICK', host, key);
    await sleep(12000);
    await shot(page, `adsense-fin-verify-${host.replace(/\./g, '-')}-${key}.png`);
    body = await dump(page, `adsense-fin-verify-${host.replace(/\./g, '-')}-${key}.txt`);
    if (/couldn.?t verify|unable to verify|we couldn.?t find/i.test(body)) {
      console.log('VERIFY_FAIL', host, key);
      continue;
    }
    // Success heuristic: ownership section collapsed / no "I've placed" / status changed
    if (!/I.?ve placed the code/i.test(body) || /Getting ready|verified|ownership confirmed/i.test(body)) {
      console.log('VERIFY_LIKELY_OK', host, key);
      return { ok: true, method: key, body };
    }
  }
  return { ok: false, body };
}

async function requestReview(page, host) {
  // Ensure on detail
  if (!page.url().includes(`url=${host}`)) {
    await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=${host}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await sleep(4000);
  }
  const btn = page.getByRole('button', { name: /request review/i }).first();
  if (!(await btn.isVisible().catch(() => false))) return false;
  const aria = await btn.getAttribute('aria-disabled');
  if (aria === 'true' || (await btn.isDisabled().catch(() => false))) {
    console.log('REVIEW_DISABLED', host);
    return false;
  }
  await btn.click({ force: true });
  console.log('REVIEW_CLICKED', host);
  await sleep(6000);
  await shot(page, `adsense-fin-review-${host.replace(/\./g, '-')}.png`);
  await dump(page, `adsense-fin-review-${host.replace(/\./g, '-')}.txt`);
  return true;
}

(async () => {
  const apexHome = await fetchText('https://loansflow.loan/');
  const apexAds = await fetchText('https://loansflow.loan/ads.txt');
  const pagesHome = await fetchText('https://loansflow.pages.dev/');
  const pagesAds = await fetchText('https://loansflow.pages.dev/ads.txt');
  const apex = adsenseReady(apexHome, apexAds);
  const pages = adsenseReady(pagesHome, pagesAds);
  const curlEvidence = { apex, pages, at: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT, 'adsense-fin-curl.json'), JSON.stringify(curlEvidence, null, 2));
  console.log('CURL', JSON.stringify(curlEvidence));

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333', { timeout: 120000 });
  const page = await browser.contexts()[0].newPage();
  await ensureSession(page);

  const results = {
    account: EMAIL,
    pub: 'ca-pub-7523216981025331',
    curl: curlEvidence,
    loan: null,
    pagesdev: null,
    at: new Date().toISOString(),
  };

  // Always ensure loansflow.loan is listed
  const loanListed = await addSiteIfMissing(page, 'loansflow.loan', 'https://loansflow.loan');
  results.loan = { listed: loanListed };

  if (apex.ready) {
    console.log('APEX_PUBLIC — verifying loansflow.loan');
    const v = await verifyHost(page, 'loansflow.loan');
    const r = await requestReview(page, 'loansflow.loan');
    results.loan = { ...results.loan, verified: v.ok, method: v.method || null, review_requested: r };
  } else {
    console.log('APEX_DOWN — skip verify until HTTPS; trying pages.dev interim');
    results.loan.verified = false;
    results.loan.blocked = 'APEX_DNS_NOT_READY';
    // Attempt verify anyway for evidence
    const v = await verifyHost(page, 'loansflow.loan');
    const r = await requestReview(page, 'loansflow.loan');
    results.loan.verify_attempt_ok = v.ok;
    results.loan.review_requested = r;
  }

  // Interim pages.dev if apex down and pages ready
  if (!apex.ready && pages.ready) {
    const listed = await addSiteIfMissing(page, 'loansflow.pages.dev', 'https://loansflow.pages.dev');
    results.pagesdev = { listed };
    if (listed) {
      // curl already proved ready
      const v = await verifyHost(page, 'loansflow.pages.dev');
      const r = await requestReview(page, 'loansflow.pages.dev');
      results.pagesdev.verified = v.ok;
      results.pagesdev.method = v.method || null;
      results.pagesdev.review_requested = r;
    } else {
      results.pagesdev.note = 'AdSense rejected or failed to add pages.dev host';
    }
  }

  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(4000);
  await shot(page, 'adsense-fin-final-list.png');
  const listBody = await dump(page, 'adsense-fin-final-list.txt');
  results.final_list_snippet = listBody.match(/loansflow[\s\S]{0,400}/i)?.[0] || listBody.slice(0, 800);
  fs.writeFileSync(path.join(OUT, 'adsense-loan-VERIFY-RESULT.json'), JSON.stringify(results, null, 2));
  console.log('RESULT_FINAL', JSON.stringify(results, null, 2));
  console.log('DONE');
})().catch((e) => {
  console.error('FAIL', e.message || e);
  fs.writeFileSync(
    path.join(OUT, 'adsense-loan-VERIFY-RESULT.json'),
    JSON.stringify({ error: String(e.message || e), at: new Date().toISOString() }, null, 2)
  );
  process.exit(1);
});

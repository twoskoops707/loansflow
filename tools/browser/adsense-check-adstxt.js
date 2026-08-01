/**
 * Open AdSense site detail for loansflow.loan, dump ads.txt status, try refresh/recheck.
 * Usage: node adsense-check-adstxt.js [host]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PUB = 'pub-7523216981025331';
const HOST = process.argv[2] || 'loansflow.loan';
const DETAIL = `https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=${HOST}`;
const LIST = `https://adsense.google.com/adsense/u/0/${PUB}/sites/list`;
const TAG = HOST.replace(/\./g, '-');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dump(page, name) {
  const body = await page.locator('body').innerText().catch(() => '');
  fs.writeFileSync(path.join(OUT, name), `${page.url()}\n\n${body.slice(0, 25000)}`);
  await page.screenshot({ path: path.join(OUT, name.replace('.txt', '.png')), fullPage: true }).catch(() => {});
  console.log('---', name);
  console.log(body.slice(0, 2200).replace(/\n/g, ' | '));
  return body;
}

function fetchAds(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () =>
        resolve({
          url,
          status: res.statusCode,
          type: res.headers['content-type'],
          body: d,
        })
      );
    });
    req.on('error', (e) => resolve({ url, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, error: 'timeout' });
    });
  });
}

function extractAdsTxtStatus(body) {
  const m = body.match(/ads\.txt[^\n]{0,80}(Authorized|Not found|Unauthorized|No ads\.txt|Found|ok|Error|Pending)/i);
  const rows = [];
  if (/Not found/i.test(body)) rows.push('Not found');
  if (/Authorized/i.test(body)) rows.push('Authorized');
  if (/Unauthorized/i.test(body)) rows.push('Unauthorized');
  return { match: m ? m[0] : null, flags: rows };
}

(async () => {
  const curls = await Promise.all([
    fetchAds(`https://${HOST}/ads.txt`),
    fetchAds(`https://www.${HOST.replace(/^www\./, '')}/ads.txt`),
    fetchAds('https://loansflow-live.pages.dev/ads.txt'),
    fetchAds('https://loansflow.pages.dev/ads.txt'),
  ]);
  fs.writeFileSync(path.join(OUT, `adsense-adstxt-curl-${TAG}.json`), JSON.stringify(curls, null, 2));
  console.log('CURL', JSON.stringify(curls.map((c) => ({ url: c.url, status: c.status, type: c.type, body: (c.body || '').trim() }))));

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333', { timeout: 60000 });
  const page =
    browser.contexts()[0].pages().find((p) => /adsense/.test(p.url())) ||
    (await browser.contexts()[0].newPage());

  await page.goto(DETAIL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(6000);
  let body = await dump(page, `adsense-adstxt-${TAG}-01-detail.txt`);

  // Expand anything mentioning ads.txt
  const adsHdr = page.getByText(/ads\.txt/i).first();
  if (await adsHdr.isVisible().catch(() => false)) {
    await adsHdr.click({ force: true }).catch(() => {});
    console.log('CLICKED_ADSTXT_TEXT');
    await sleep(1500);
  }

  // Try common refresh / check again / recheck controls
  const refreshLabels = [
    /^refresh$/i,
    /check again/i,
    /re-?check/i,
    /update status/i,
    /crawl again/i,
    /verify ads\.txt/i,
  ];
  for (const re of refreshLabels) {
    const btn = page.getByRole('button', { name: re }).first();
    if (await btn.isVisible().catch(() => false)) {
      console.log('CLICK_REFRESH', String(re));
      await btn.click({ force: true });
      await sleep(8000);
      break;
    }
  }

  // Also try icon buttons near ads.txt
  const icons = page.locator('button[aria-label*="refresh" i], button[aria-label*="Reload" i], button[aria-label*="ads.txt" i]');
  const ic = await icons.count();
  console.log('ICON_BTNS', ic);
  for (let i = 0; i < ic; i++) {
    const b = icons.nth(i);
    if (await b.isVisible().catch(() => false)) {
      console.log('CLICK_ICON', await b.getAttribute('aria-label'));
      await b.click({ force: true });
      await sleep(5000);
    }
  }

  body = await dump(page, `adsense-adstxt-${TAG}-02-after.txt`);

  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(5000);
  const listBody = await dump(page, `adsense-adstxt-${TAG}-03-list.txt`);

  // Parse list rows for this host
  const hostIdx = listBody.indexOf(HOST);
  const listSnippet = hostIdx >= 0 ? listBody.slice(hostIdx, hostIdx + 220) : listBody.slice(0, 800);
  const status = extractAdsTxtStatus(listSnippet + '\n' + body);

  const result = {
    account: 'Loans.flow.loan@gmail.com',
    pub: 'ca-pub-7523216981025331',
    host: HOST,
    public_ads_txt: curls.map((c) => ({
      url: c.url,
      status: c.status,
      type: c.type,
      body: (c.body || '').trim().slice(0, 120),
      error: c.error || null,
    })),
    adsense_ads_txt_status: status,
    list_snippet: listSnippet.replace(/\n/g, ' | '),
    detail_has_not_found: /Not found/i.test(body),
    detail_has_authorized: /Authorized/i.test(body),
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, `adsense-adstxt-${TAG}-RESULT.json`), JSON.stringify(result, null, 2));
  console.log('RESULT', JSON.stringify(result, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});

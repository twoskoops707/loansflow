/**
 * After ownership verify toast ("Your site is verified"), click Next → Request review.
 * Handles both loansflow.pages.dev and loansflow.loan.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PUB = 'pub-7523216981025331';
const HOSTS = process.argv.slice(2).length ? process.argv.slice(2) : ['loansflow.pages.dev', 'loansflow.loan'];
const LIST = `https://adsense.google.com/adsense/u/0/${PUB}/sites/list`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function dump(page, name) {
  const body = await page.locator('body').innerText().catch(() => '');
  fs.writeFileSync(path.join(OUT, name), `${page.url()}\n\n${body.slice(0, 22000)}`);
  await page.screenshot({ path: path.join(OUT, name.replace('.txt', '.png')), fullPage: true }).catch(() => {});
  console.log('---', name, '---');
  console.log(body.slice(0, 1600).replace(/\n/g, ' | '));
  return body;
}

function fetchText(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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

async function publicReady(host) {
  const home = await fetchText(`https://${host}/`);
  const ads = await fetchText(`https://${host}/ads.txt`);
  return {
    ready:
      home.ok &&
      /google-adsense-account/i.test(home.body) &&
      /ca-pub-7523216981025331/.test(home.body) &&
      /adsbygoogle\.js\?client=ca-pub-7523216981025331/.test(home.body) &&
      ads.ok &&
      /pub-7523216981025331/.test(ads.body),
    home_err: home.error || home.status,
    ads: ads.ok ? ads.body.trim() : ads.error,
  };
}

async function checkPlaced(page) {
  for (const re of [/i.?ve placed the html/i, /i.?ve placed the (adsense )?code/i, /i.?ve placed the ads\.txt/i, /i.?ve placed/i]) {
    const el = page.getByText(re).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click({ force: true });
      await sleep(600);
    }
  }
  const boxes = page.locator('[role="checkbox"], mat-checkbox');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    const b = boxes.nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    if ((await b.getAttribute('aria-checked')) !== 'true') {
      await b.click({ force: true });
      await sleep(400);
    }
  }
}

async function dismissVerifiedNext(page) {
  // Toast/dialog: "Your site is verified" + Next
  for (let i = 0; i < 5; i++) {
    const body = await page.locator('body').innerText().catch(() => '');
    if (/your site is verified/i.test(body)) {
      console.log('SAW_VERIFIED_TOAST');
      const next = page.getByRole('button', { name: /^next$/i }).or(page.getByText(/^Next$/i));
      if (await next.first().isVisible().catch(() => false)) {
        await next.first().click({ force: true });
        console.log('CLICKED_NEXT');
        await sleep(4000);
        return true;
      }
    }
    await sleep(1000);
  }
  return false;
}

async function verifyAndReview(page, host) {
  const tag = host.replace(/\./g, '-');
  const detail = `https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=${host}`;
  const pub = await publicReady(host);
  console.log('PUBLIC', host, pub);
  fs.writeFileSync(path.join(OUT, `adsense-next-curl-${tag}.json`), JSON.stringify(pub, null, 2));

  await page.goto(detail, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(5000);
  let body = await dump(page, `adsense-next-${tag}-01.txt`);

  // If already verified toast leftover
  await dismissVerifiedNext(page);

  let ownershipVerified = false;
  let sawToast = false;

  // Expand ownership if present
  if (/verify site ownership/i.test(body)) {
    const hdr = page.getByText(/verify site ownership/i).first();
    if (await hdr.isVisible().catch(() => false)) {
      await hdr.click({ force: true });
      await sleep(1500);
    }

    if (pub.ready) {
      const metaTab = page.getByRole('tab', { name: /meta tag/i });
      if (await metaTab.count()) await metaTab.first().click({ force: true });
      else {
        const t = page.locator('text=Meta tag').first();
        if (await t.isVisible().catch(() => false)) await t.click({ force: true });
      }
      await sleep(1500);
      await checkPlaced(page);
      const verify = page.getByRole('button', { name: /^verify$/i }).first();
      if (await verify.isVisible().catch(() => false)) {
        await verify.click({ force: true });
        console.log('VERIFY_CLICK', host);
        await sleep(12000);
      }
      body = await dump(page, `adsense-next-${tag}-02-after-verify.txt`);
      sawToast = await dismissVerifiedNext(page);
      body = await dump(page, `adsense-next-${tag}-03-after-next.txt`);

      if (/verify site ownership/i.test(body) && /i.?ve placed/i.test(body)) {
        const adsTab = page.getByRole('tab', { name: /ads\.txt/i });
        if (await adsTab.count()) await adsTab.first().click({ force: true });
        else {
          const t = page.locator('text=Ads.txt snippet').first();
          if (await t.isVisible().catch(() => false)) await t.click({ force: true });
        }
        await sleep(1200);
        await checkPlaced(page);
        const v2 = page.getByRole('button', { name: /^verify$/i }).first();
        if (await v2.isVisible().catch(() => false)) {
          await v2.click({ force: true });
          await sleep(12000);
        }
        sawToast = (await dismissVerifiedNext(page)) || sawToast;
        body = await dump(page, `adsense-next-${tag}-04-adstxt.txt`);
      }

      ownershipVerified =
        /your site is verified/i.test(body) || sawToast || !/i.?ve placed/i.test(body);
    } else {
      console.log('SKIP_VERIFY_PUBLIC_DOWN', host);
      await checkPlaced(page);
      const verify = page.getByRole('button', { name: /^verify$/i }).first();
      if (await verify.isVisible().catch(() => false)) {
        await verify.click({ force: true });
        await sleep(10000);
      }
      body = await dump(page, `adsense-next-${tag}-02-down-attempt.txt`);
      sawToast = await dismissVerifiedNext(page);
      ownershipVerified = /your site is verified/i.test(body) || sawToast;
    }
  } else {
    ownershipVerified = true;
    console.log('NO_OWNERSHIP_PANEL', host);
  }

  // Request review
  let review = false;
  const reviewBtn = page.getByRole('button', { name: /request review/i }).first();
  if (await reviewBtn.isVisible().catch(() => false)) {
    const aria = await reviewBtn.getAttribute('aria-disabled');
    console.log('REVIEW', host, aria);
    if (aria !== 'true' && !(await reviewBtn.isDisabled().catch(() => false))) {
      await reviewBtn.click({ force: true });
      review = true;
      console.log('REVIEW_CLICKED', host);
      await sleep(8000);
      body = await dump(page, `adsense-next-${tag}-05-review.txt`);
    }
  }

  return {
    host,
    public_ready: pub.ready,
    public: pub,
    ownership_verified: !!ownershipVerified,
    review_requested: review,
  };
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333', { timeout: 120000 });
  const context = browser.contexts()[0];
  let page = context.pages().find((p) => /adsense\.google\.com/.test(p.url())) || (await context.newPage());
  await page.bringToFront().catch(() => {});

  const results = [];
  for (const host of HOSTS) {
    results.push(await verifyAndReview(page, host));
  }

  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(4000);
  const listBody = await dump(page, 'adsense-next-FINAL-list.txt');

  const summary = {
    account: 'Loans.flow.loan@gmail.com',
    pub: 'ca-pub-7523216981025331',
    results,
    list_snippet: listBody.match(/loansflow[\s\S]{0,500}/i)?.[0] || null,
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, 'adsense-loan-VERIFY-RESULT.json'), JSON.stringify(summary, null, 2));
  console.log('RESULT_FINAL', JSON.stringify(summary, null, 2));
  console.log('DONE');
})().catch((e) => {
  console.error('FAIL', e.message || e);
  process.exit(1);
});

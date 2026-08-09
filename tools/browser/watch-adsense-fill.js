/**
 * Strict live-site AdSense fill watcher (NO AdSense UI / no extra Google logins).
 * Counts only ins.adsbygoogle[data-ad-status=filled].
 * On first real fill → ntfy twskoops once + write state file.
 *
 * Usage:
 *   node watch-adsense-fill.js            # one shot
 *   node watch-adsense-fill.js --loop     # every INTERVAL_MS (default 20m)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const STATE = path.join(OUT, 'adsense-fill-watch-state.json');
const NOTIFIED = path.join(OUT, 'adsense-fill-notified.json');
const TOPIC = process.env.CPHARM_NTFY_TOPIC || 'twskoops';
const INTERVAL_MS = Number(process.env.LOANSFLOW_FILL_WATCH_MS || 20 * 60 * 1000);
const PAGES = ['https://loansflow.loan/', 'https://loansflow.loan/tools/?step=0'];
const loop = process.argv.includes('--loop');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ntfy(title, body) {
  return new Promise((resolve) => {
    const req = https.request(
      `https://ntfy.sh/${TOPIC}`,
      {
        method: 'POST',
        headers: {
          Title: title.slice(0, 120),
          Priority: 'high',
          Tags: 'moneybag,white_check_mark',
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      }
    );
    req.on('error', () => resolve(0));
    req.write(body);
    req.end();
  });
}

async function probePage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  await page.evaluate(async () => {
    window.scrollBy(0, 700);
    await new Promise((r) => setTimeout(r, 800));
    window.scrollBy(0, 1200);
    await new Promise((r) => setTimeout(r, 800));
  });
  await sleep(4000);
  return page.evaluate(() => {
    const ins = [...document.querySelectorAll('ins.adsbygoogle')].map((el) => ({
      status: (el.getAttribute('data-ad-status') || '').toLowerCase(),
      format: el.getAttribute('data-ad-format'),
      client: el.getAttribute('data-ad-client'),
      hasIframe: !!el.querySelector('iframe'),
      h: el.clientHeight,
      w: el.clientWidth,
    }));
    const filled = ins.filter((x) => x.status === 'filled');
    const unfilled = ins.filter((x) => x.status === 'unfilled');
    return {
      url: location.href,
      title: document.title,
      filled: filled.length,
      unfilled: unfilled.length,
      total: ins.length,
      ins,
      script: !!document.querySelector('script[src*="adsbygoogle"]'),
    };
  });
}

async function runOnce() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 900, height: 1600 },
  });
  const page = await context.newPage();
  const pages = [];
  for (const url of PAGES) {
    pages.push(await probePage(page, url));
  }
  await browser.close();

  const filledTotal = pages.reduce((n, p) => n + p.filled, 0);
  const result = {
    at: new Date().toISOString(),
    filledTotal,
    anyFilled: filledTotal > 0,
    pages,
  };
  let prev = {};
  try {
    prev = JSON.parse(fs.readFileSync(NOTIFIED, 'utf8'));
  } catch (_) {}

  fs.writeFileSync(STATE, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify(
      {
        at: result.at,
        filledTotal,
        anyFilled: result.anyFilled,
        pages: pages.map((p) => ({
          url: p.url,
          filled: p.filled,
          unfilled: p.unfilled,
          total: p.total,
        })),
      },
      null,
      2
    )
  );

  if (result.anyFilled && !prev.notified) {
    const body = `LoansFlow AdSense FILL detected (${filledTotal} unit(s)). Seq packs ready in repo — waiting for your GO before farm sync/clicks.`;
    await ntfy('LoansFlow ads FILLED', body);
    fs.writeFileSync(
      NOTIFIED,
      JSON.stringify({ notified: true, at: result.at, filledTotal }, null, 2)
    );
    console.log('NTFY_SENT');
  }
  return result;
}

(async () => {
  do {
    try {
      await runOnce();
    } catch (e) {
      console.error('WATCH_ERR', e.message || e);
    }
    if (loop) {
      console.log('sleep', INTERVAL_MS);
      await sleep(INTERVAL_MS);
    }
  } while (loop);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

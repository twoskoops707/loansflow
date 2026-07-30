/**
 * Ezoic publisher join: email → continue → add loansflow.loan → prefer JS / Incubator.
 * Does NOT select Cloudflare NS integration or rewrite ads.txt.
 *
 * Usage: node ezoic-join.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const EMAIL = 'loansflow707@gmail.com';
const SITE = 'https://loansflow.loan';
const PASS_FILE = path.join(OUT, '.secret-gmail-password.txt');

fs.mkdirSync(OUT, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dump(page, name) {
  const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 18000);
  const txt = `${page.url()}\n\n${body}`;
  fs.writeFileSync(path.join(OUT, name + '.txt'), txt);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }).catch(() => {});
  console.log('DUMP', name, page.url(), 'len', body.length);
  return body;
}

async function fillVisible(page, selectors, value) {
  for (const sel of selectors) {
    const loc = page.locator(sel);
    if (await loc.first().isVisible().catch(() => false)) {
      await loc.first().fill(value);
      console.log('FILL', sel, value.slice(0, 40));
      return true;
    }
  }
  return false;
}

async function clickText(page, re) {
  const candidates = [
    page.getByRole('button', { name: re }),
    page.getByRole('link', { name: re }),
    page.getByText(re),
  ];
  for (const c of candidates) {
    if (await c.first().isVisible().catch(() => false)) {
      console.log('CLICK', String(re));
      await c.first().click();
      await sleep(2500);
      return true;
    }
  }
  return false;
}

(async () => {
  const password = fs.existsSync(PASS_FILE)
    ? fs.readFileSync(PASS_FILE, 'utf8').trim()
    : '';
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = await context.newPage();
  const result = {
    at: new Date().toISOString(),
    email: EMAIL,
    site: SITE,
    steps: [],
    verdict: 'unknown',
    policy: {
      changedDns: false,
      changedAdsTxt: false,
      selectedCloudflareIntegration: false,
      keptAdSenseSnippets: true,
    },
  };

  await page.goto('https://pubdash.ezoic.com/join', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(3500);
  let body = await dump(page, 'ezoic-join-01');

  // Email step
  await fillVisible(
    page,
    [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="mail" i]',
      'input[type="text"]',
    ],
    EMAIL
  );
  result.steps.push('filled_email');
  await clickText(page, /^continue$/i);
  await sleep(4000);
  body = await dump(page, 'ezoic-join-02');

  // Password / account setup
  if (/password|set a password|create/i.test(body)) {
    await fillVisible(page, ['input[type="password"]'], password || 'LoansFlow-Ezoic-2026!');
    result.steps.push('filled_password');
    await clickText(page, /continue|next|create|submit|save|sign up/i);
    await sleep(4000);
    body = await dump(page, 'ezoic-join-03-password');
  }

  // Domain / site
  for (let i = 0; i < 6; i++) {
    body = await dump(page, `ezoic-join-loop-${i}`);
    result.steps.push({ loop: i, url: page.url(), snippet: body.slice(0, 300) });

    if (/incubator/i.test(body) && /apply/i.test(body)) {
      await clickText(page, /apply to incubator/i);
      await sleep(3000);
      await clickText(page, /apply/i);
      result.steps.push('clicked_incubator');
      await sleep(3000);
      continue;
    }

    if (/domain|website|site url|enter your/i.test(body)) {
      const filled = await fillVisible(
        page,
        [
          'input[type="url"]',
          'input[name*="domain" i]',
          'input[name*="site" i]',
          'input[name*="url" i]',
          'input[placeholder*="domain" i]',
          'input[placeholder*="example" i]',
          'input[placeholder*="http" i]',
          'input[type="text"]',
        ],
        SITE.replace(/^https?:\/\//, '')
      );
      if (!filled) {
        await fillVisible(page, ['input[type="text"]', 'input[type="url"]'], SITE);
      }
      result.steps.push('filled_domain');
      await clickText(page, /continue|next|add|submit|save/i);
      await sleep(3500);
      continue;
    }

    // Integration chooser — JS only
    if (/java\s*script|cloudflare|name\s*server|wordpress/i.test(body)) {
      if (await clickText(page, /java\s*script/i)) {
        result.steps.push('chose_javascript');
        result.policy.selectedCloudflareIntegration = false;
      } else {
        result.steps.push('integration_chooser_seen_no_js_click');
      }
      await sleep(2500);
      // Explicitly avoid Cloudflare / Nameserver buttons
      continue;
    }

    if (/250.?000|monthly (active )?user|audience/i.test(body)) {
      result.steps.push('traffic_gate_seen');
      if (await clickText(page, /incubator/i)) {
        result.steps.push('incubator_from_traffic_gate');
      }
      await sleep(2500);
      continue;
    }

    // Generic continue
    if (await clickText(page, /continue|next|get started|finish|done|submit/i)) {
      await sleep(3000);
      continue;
    }
    break;
  }

  body = await dump(page, 'ezoic-join-final');
  result.finalUrl = page.url();
  result.finalSnippet = body.slice(0, 3000);

  const lower = body.toLowerCase();
  if (/review in progress|application (is )?pending|incubator/.test(lower)) {
    result.verdict = 'incubator_or_review';
  } else if (/java\s*script|header script|sa\.min\.js|gatekeeper|integrate/.test(lower)) {
    result.verdict = 'needs_js_headers_only_later';
  } else if (/sign in|register|email:/.test(lower) && !/dashboard|domain/.test(lower)) {
    result.verdict = 'auth_or_join_incomplete';
  } else if (/thank|welcome|dashboard|publisher/.test(lower)) {
    result.verdict = 'account_created_partial';
  } else {
    result.verdict = 'partial_manual_followup';
  }

  fs.writeFileSync(path.join(OUT, 'ezoic-join-RESULT.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  console.error(e);
  fs.writeFileSync(
    path.join(OUT, 'ezoic-join-RESULT.json'),
    JSON.stringify({ error: String(e.stack || e) }, null, 2)
  );
  process.exit(1);
});

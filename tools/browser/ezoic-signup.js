/**
 * Ezoic account signup / add loansflow.loan / Incubator path.
 * Uses Chrome CDP :9333. Does NOT change Cloudflare NS or ads.txt.
 *
 * Usage: node ezoic-signup.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const EMAIL = 'Loans.flow.loan@gmail.com';
const SITE = 'loansflow.loan';
const PASS_FILE = path.join(OUT, '.secret-gmail-password.txt');

fs.mkdirSync(OUT, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dump(page, name) {
  const txt = `${page.url()}\n\n${(await page.locator('body').innerText().catch(() => '')).slice(0, 16000)}`;
  fs.writeFileSync(path.join(OUT, name + '.txt'), txt);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }).catch(() => {});
  console.log('DUMP', name, page.url());
  return txt;
}

async function clickFirst(page, patterns) {
  for (const name of patterns) {
    const btn = page.getByRole('button', { name }).or(page.getByRole('link', { name }));
    if (await btn.first().isVisible().catch(() => false)) {
      console.log('CLICK', String(name));
      await btn.first().click();
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
    urls: [],
  };

  // Start at Ezoic publisher signup / login
  const startUrls = [
    'https://pubdash.ezoic.com/signup',
    'https://www.ezoic.com/signup/',
    'https://pubdash.ezoic.com/login',
  ];

  let landed = false;
  for (const url of startUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await sleep(4000);
      const body = await page.locator('body').innerText().catch(() => '');
      await dump(page, 'ezoic-01-start');
      result.steps.push({ url, bodyStart: body.slice(0, 400) });
      if (!/doesn't work properly without JavaScript/i.test(body) || body.length > 80) {
        landed = true;
        break;
      }
    } catch (e) {
      result.steps.push({ url, error: String(e.message || e) });
    }
  }

  if (!landed) {
    result.verdict = 'failed_to_load_signup';
    fs.writeFileSync(path.join(OUT, 'ezoic-RESULT.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // Prefer Google / Continue with Google if present
  const googleBtn = page
    .getByRole('button', { name: /google/i })
    .or(page.getByRole('link', { name: /google|continue with google|sign in with google/i }))
    .or(page.locator('text=/Continue with Google|Sign in with Google|Sign up with Google/i'));
  if (await googleBtn.first().isVisible().catch(() => false)) {
    console.log('CLICK Google auth');
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 15000 }).catch(() => null),
      googleBtn.first().click(),
    ]);
    await sleep(3000);
    const authPage = popup || page;
    await dump(authPage, 'ezoic-02-google');

    // Account chooser / email
    const emailBox = authPage.locator('input[type="email"], input[name="identifier"]');
    if (await emailBox.count()) {
      await emailBox.first().fill(EMAIL);
      await authPage.getByRole('button', { name: /next/i }).click().catch(() => {});
      await sleep(3500);
      await dump(authPage, 'ezoic-03-after-email');
    }
    // Click account if chooser
    const acct = authPage.getByText(EMAIL);
    if (await acct.first().isVisible().catch(() => false)) {
      await acct.first().click();
      await sleep(3500);
      await dump(authPage, 'ezoic-03b-chooser');
    }
    const passBox = authPage.locator('input[type="password"], input[name="Passwd"]');
    if ((await passBox.count()) && password) {
      await passBox.first().fill(password);
      await authPage.getByRole('button', { name: /next/i }).click().catch(() => {});
      await sleep(5000);
      await dump(authPage, 'ezoic-04-after-pass');
    }
    // Consent / continue
    await clickFirst(authPage, [/continue|allow|accept|confirm|yes/i]);
    await sleep(4000);
    if (popup && !popup.isClosed()) {
      await sleep(2000);
    }
  } else {
    // Email/password form on Ezoic
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]');
    if (await emailInput.first().isVisible().catch(() => false)) {
      await emailInput.first().fill(EMAIL);
      result.steps.push({ filled: 'email' });
    }
    const passInput = page.locator('input[type="password"]');
    if ((await passInput.first().isVisible().catch(() => false)) && password) {
      // Use Gmail password only if Ezoic accepts Google password — may need separate Ezoic pw
      await passInput.first().fill(password);
      result.steps.push({ filled: 'password_from_dropfile' });
    }
    await clickFirst(page, [/sign up|create account|register|get started|continue|next|submit/i]);
    await sleep(4000);
    await dump(page, 'ezoic-02-email-form');
  }

  await sleep(3000);
  await dump(page, 'ezoic-05-post-auth');
  result.urls.push(page.url());

  // If already logged in, go to dashboard / add site
  const dashUrls = [
    'https://pubdash.ezoic.com/',
    'https://pubdash.ezoic.com/settings/domains',
    'https://pubdash.ezoic.com/ezoicads',
  ];
  for (const u of dashUrls) {
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    await sleep(3500);
    const body = await dump(page, 'ezoic-06-dash-' + u.replace(/https?:\/\//, '').replace(/\W+/g, '_').slice(0, 40));
    result.urls.push(page.url());
    if (/incubator|250,?000|add (a )?site|integrate|domain|monthly/i.test(body)) {
      result.steps.push({ dash: u, matched: true });
      break;
    }
  }

  // Try apply to Incubator / add domain
  await clickFirst(page, [
    /apply to incubator/i,
    /incubator/i,
    /add (a )?site|add domain|add website/i,
    /get started/i,
    /integrate/i,
  ]);
  await sleep(3000);
  await dump(page, 'ezoic-07-after-cta');

  // Fill domain if prompted
  const domainInput = page
    .getByLabel(/domain|website|site|url/i)
    .or(page.locator('input[type="url"], input[name*="domain" i], input[placeholder*="domain" i], input[placeholder*="example" i]'));
  if (await domainInput.first().isVisible().catch(() => false)) {
    await domainInput.first().fill(SITE);
    console.log('FILLED domain', SITE);
    result.steps.push({ filledDomain: SITE });
    await clickFirst(page, [/continue|next|add|submit|save|create/i]);
    await sleep(4000);
    await dump(page, 'ezoic-08-domain-added');
  }

  // Prefer JavaScript over Cloudflare / Nameserver if chooser appears
  const jsOpt = page.getByText(/java\s*script/i).or(page.getByRole('button', { name: /java\s*script/i }));
  const cfOptVisible = await page.getByText(/cloudflare/i).first().isVisible().catch(() => false);
  if (await jsOpt.first().isVisible().catch(() => false)) {
    await jsOpt.first().click();
    result.steps.push({ integrationChoice: 'javascript' });
    await sleep(2000);
    await dump(page, 'ezoic-09-js-choice');
  } else if (cfOptVisible) {
    result.steps.push({
      note: 'Cloudflare option visible — NOT selecting (DNS takeover risk mid AdSense)',
    });
  }

  await clickFirst(page, [/apply to incubator/i, /apply/i, /submit application/i, /finish|done|continue/i]);
  await sleep(4000);
  const finalBody = await dump(page, 'ezoic-10-final');
  result.urls.push(page.url());
  result.finalSnippet = finalBody.slice(0, 2500);

  const lower = finalBody.toLowerCase();
  if (/incubator|review in progress|application|pending|under review/.test(lower)) {
    result.verdict = 'incubator_or_review_path';
  } else if (/250.?000|does not meet|not eligible|too small/.test(lower)) {
    result.verdict = 'below_traffic_threshold';
  } else if (/login|sign in|password/.test(lower) && !/dashboard|domain|integrate/.test(lower)) {
    result.verdict = 'auth_blocked';
  } else if (/integrate|javascript|cloudflare|name.?server/.test(lower)) {
    result.verdict = 'account_reached_integration_chooser';
  } else {
    result.verdict = 'partial_manual_followup';
  }

  // Explicit: do not click Cloudflare connect or nameserver change
  result.policy = {
    changedDns: false,
    changedAdsTxt: false,
    selectedCloudflareIntegration: false,
    keptAdSenseSnippets: true,
  };

  fs.writeFileSync(path.join(OUT, 'ezoic-RESULT.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

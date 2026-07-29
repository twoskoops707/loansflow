/**
 * Watch for Gmail password drop-file, then auto-apply AdSense + Ezoic + affiliates.
 * Password file: docs/automation/.secret-gmail-password.txt (one line)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..', '..');
const SECRET = path.join(ROOT, 'docs', 'automation', '.secret-gmail-password.txt');
const OUT = path.join(ROOT, 'docs', 'automation');
const EMAIL = 'loansflow707@gmail.com';
const SITE = 'https://twoskoops707.github.io/loansflow/';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readPassword() {
  if (!fs.existsSync(SECRET)) return null;
  const pw = fs.readFileSync(SECRET, 'utf8').trim();
  return pw || null;
}

async function ensureChrome() {
  try {
    await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9333/json/version', (res) => {
        res.resume();
        resolve();
      }).on('error', reject);
    });
    return;
  } catch (_) {}
  const { spawn } = require('child_process');
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userData = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
  spawn(
    chrome,
    [
      '--remote-debugging-port=9333',
      `--user-data-dir=${userData}`,
      '--profile-directory=Profile 3',
      '--no-first-run',
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' }
  ).unref();
  await sleep(6000);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
}

async function googleLogin(page, password) {
  await page.goto(
    'https://accounts.google.com/ServiceLogin?continue=https://adsense.google.com/adsense/signup/create',
    { waitUntil: 'domcontentloaded', timeout: 90000 }
  );
  await sleep(2000);
  const email = page.locator('input[type="email"], input[name="identifier"]');
  if (await email.count()) {
    await email.first().fill(EMAIL);
    await page.getByRole('button', { name: /next/i }).click();
    await sleep(3000);
  }
  const pass = page.locator('input[type="password"], input[name="Passwd"]');
  if (await pass.count()) {
    await pass.first().fill(password);
    await page.getByRole('button', { name: /next/i }).click();
    await sleep(5000);
  }
  await shot(page, 'apply-01-after-login.png');
  // 2FA hard-stop
  const body = await page.locator('body').innerText();
  if (/2-step|verify|authenticator|phone|challenge/i.test(body) && /enter code|verification/i.test(body)) {
    fs.writeFileSync(path.join(OUT, 'BLOCKED-2FA.txt'), body.slice(0, 4000));
    throw new Error('2FA required — cannot continue unattended');
  }
}

async function applyAdSense(page) {
  await page.goto('https://www.google.com/adsense/start/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2000);
  const start = page.getByRole('link', { name: /get started/i }).or(page.getByRole('button', { name: /get started/i }));
  if (await start.first().isVisible().catch(() => false)) {
    await start.first().click();
    await sleep(4000);
  }
  // Site URL field patterns vary
  const urlInput = page.locator('input[type="url"], input[name*="url"], input[aria-label*="site" i], input[aria-label*="URL" i]');
  if (await urlInput.count()) {
    await urlInput.first().fill(SITE);
  }
  await shot(page, 'apply-02-adsense.png');
  fs.writeFileSync(
    path.join(OUT, 'adsense-page.txt'),
    `${page.url()}\n${await page.title()}\n\n${(await page.locator('body').innerText()).slice(0, 6000)}`
  );
  // Click continue / submit if present
  for (const name of [/continue/i, /submit/i, /create account/i, /save/i, /next/i]) {
    const btn = page.getByRole('button', { name });
    if (await btn.first().isVisible().catch(() => false)) {
      await btn.first().click();
      await sleep(3000);
      break;
    }
  }
  await shot(page, 'apply-03-adsense-after.png');
}

async function applyEzoic(page) {
  await page.goto('https://www.ezoic.com/publishers/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2000);
  await shot(page, 'apply-10-ezoic.png');
  const cta = page.getByRole('link', { name: /get started|sign up|join|apply/i }).or(
    page.getByRole('button', { name: /get started|sign up|join|apply/i })
  );
  if (await cta.first().isVisible().catch(() => false)) {
    await cta.first().click();
    await sleep(4000);
  }
  // Prefer Google SSO if available
  const g = page.getByRole('button', { name: /google/i }).or(page.getByRole('link', { name: /google/i }));
  if (await g.first().isVisible().catch(() => false)) {
    await g.first().click();
    await sleep(5000);
  }
  await shot(page, 'apply-11-ezoic-form.png');
  fs.writeFileSync(
    path.join(OUT, 'ezoic-page.txt'),
    `${page.url()}\n${(await page.locator('body').innerText()).slice(0, 6000)}`
  );
}

async function applyMediavine(page) {
  await page.goto('https://www.mediavine.com/publishing/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2000);
  await shot(page, 'apply-20-mediavine.png');
  fs.writeFileSync(
    path.join(OUT, 'mediavine-page.txt'),
    `${page.url()}\n${(await page.locator('body').innerText()).slice(0, 4000)}`
  );
}

async function applyAmazonAssociates(page) {
  await page.goto('https://affiliate-program.amazon.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2000);
  await shot(page, 'apply-30-amazon.png');
  fs.writeFileSync(
    path.join(OUT, 'amazon-page.txt'),
    `${page.url()}\n${(await page.locator('body').innerText()).slice(0, 4000)}`
  );
}

async function runOnce(password) {
  await ensureChrome();
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  console.log('Logging in as', EMAIL);
  await googleLogin(page, password);
  console.log('AdSense...');
  await applyAdSense(page);
  console.log('Ezoic...');
  await applyEzoic(page);
  console.log('Mediavine...');
  await applyMediavine(page);
  console.log('Amazon Associates...');
  await applyAmazonAssociates(page);
  fs.writeFileSync(path.join(OUT, 'APPLY-COMPLETE.txt'), new Date().toISOString());
  console.log('APPLY PASS COMPLETE — review screenshots in docs/automation');
  // scrub password file after use
  try {
    fs.unlinkSync(SECRET);
  } catch (_) {}
}

async function main() {
  console.log('Watching for', SECRET);
  for (;;) {
    const pw = readPassword();
    if (pw) {
      console.log('Password found — starting applications');
      await runOnce(pw);
      return;
    }
    await sleep(5000);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

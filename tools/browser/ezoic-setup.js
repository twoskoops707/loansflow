/**
 * Complete Ezoic account setup for loansflow.loan (already on /setup).
 * Chooses AdSense Yes, Ad Manager No. Does NOT touch Cloudflare NS / ads.txt.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PASS_FILE = path.join(OUT, '.secret-gmail-password.txt');
const FULL_NAME = 'LoansFlow Publisher';
// Separate Ezoic password (do not reuse Gmail password in plaintext logs)
const EZOIC_PASS = 'LoansFlow-Ez!2026Pub';

fs.mkdirSync(OUT, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dump(page, name) {
  const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 18000);
  fs.writeFileSync(path.join(OUT, name + '.txt'), `${page.url()}\n\n${body}`);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }).catch(() => {});
  console.log('DUMP', name, page.url());
  return body;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  const result = {
    at: new Date().toISOString(),
    site: 'loansflow.loan',
    steps: [],
    policy: {
      changedDns: false,
      changedAdsTxt: false,
      selectedCloudflareIntegration: false,
      keptAdSenseSnippets: true,
    },
  };

  await page.goto('https://pubdash.ezoic.com/setup', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(4000);
  let body = await dump(page, 'ezoic-setup-01');

  // Fill name — first text input that isn't password
  const nameInput = page.locator('input[type="text"], input:not([type])').first();
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(FULL_NAME);
    result.steps.push('filled_name');
  }

  // Password fields (may be password + confirm)
  const passInputs = page.locator('input[type="password"]');
  const nPass = await passInputs.count();
  for (let i = 0; i < nPass; i++) {
    await passInputs.nth(i).fill(EZOIC_PASS);
  }
  if (nPass) result.steps.push({ filled_password_fields: nPass });

  // Ad Manager = No, AdSense = Yes
  // Click No near Ad Manager, Yes near AdSense by section text
  await page.evaluate(() => {
    const text = document.body.innerText;
    const radios = [...document.querySelectorAll('input[type="radio"], .v-radio, [role="radio"], label')];
    // Heuristic: find labels containing Yes/No after question headers
    const clickLabel = (containsQuestion, answer) => {
      const all = [...document.querySelectorAll('label, .v-label, span, div')];
      let inSection = false;
      for (const el of all) {
        const t = (el.innerText || '').trim();
        if (new RegExp(containsQuestion, 'i').test(t) && t.length < 120) {
          inSection = true;
          continue;
        }
        if (inSection && new RegExp('^' + answer + '$', 'i').test(t)) {
          el.click();
          return true;
        }
        // leave section on next question-like line
        if (inSection && /\?/.test(t) && t.length < 120 && !new RegExp(containsQuestion, 'i').test(t)) {
          inSection = false;
        }
      }
      return false;
    };
    return {
      adManagerNo: clickLabel('Ad Manager', 'No'),
      adSenseYes: clickLabel('AdSense', 'Yes'),
      bodyHas: text.slice(0, 200),
    };
  });
  result.steps.push('clicked_ad_manager_no_adsense_yes_attempt');
  await sleep(1000);

  // Fallback: getByText Yes/No with nth
  const noBtns = page.getByText(/^No$/);
  const yesBtns = page.getByText(/^Yes$/);
  if ((await noBtns.count()) >= 1) {
    await noBtns.first().click().catch(() => {});
    result.steps.push('clicked_first_No');
  }
  if ((await yesBtns.count()) >= 1) {
    // Prefer last Yes (AdSense question is second)
    await yesBtns.nth(Math.min(1, (await yesBtns.count()) - 1)).click().catch(() => {});
    result.steps.push('clicked_adsense_Yes');
  }
  await sleep(1500);
  body = await dump(page, 'ezoic-setup-02-filled');

  // Save — wait until enabled
  const save = page.getByRole('button', { name: /^save$/i });
  for (let i = 0; i < 20; i++) {
    const disabled = await save.first().isDisabled().catch(() => true);
    if (!disabled) break;
    await sleep(500);
  }
  if (await save.first().isVisible().catch(() => false)) {
    await save.first().click({ force: true }).catch(async () => {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) =>
          /^save$/i.test((x.innerText || '').trim())
        );
        if (b) b.click();
      });
    });
    result.steps.push('clicked_save');
  }
  await sleep(5000);
  body = await dump(page, 'ezoic-setup-03-after-save');

  // Post-setup navigation: incubator / connect / JS
  for (let i = 0; i < 8; i++) {
    body = await dump(page, `ezoic-setup-post-${i}`);
    result.steps.push({ post: i, url: page.url(), snip: body.slice(0, 250) });

    if (/apply to incubator/i.test(body)) {
      await page.getByText(/apply to incubator/i).first().click().catch(() => {});
      result.steps.push('apply_incubator');
      await sleep(3000);
      continue;
    }
    if (/java\s*script/i.test(body) && /cloudflare|name\s*server|wordpress|integrat/i.test(body)) {
      await page.getByText(/java\s*script/i).first().click().catch(() => {});
      result.steps.push('chose_js');
      await sleep(2500);
      continue;
    }
    // Skip Cloudflare / Nameserver deliberately
    if (/continue|next|get started|finish|done|submit|connect/i.test(body)) {
      const clicked = await page
        .getByRole('button', { name: /continue|next|get started|finish|done|submit|connect/i })
        .first()
        .click()
        .then(() => true)
        .catch(() => false);
      if (clicked) {
        result.steps.push('generic_continue');
        await sleep(3000);
        continue;
      }
    }
    break;
  }

  body = await dump(page, 'ezoic-setup-final');
  result.finalUrl = page.url();
  result.finalSnippet = body.slice(0, 3500);

  // Persist ezoic password tip for user (not the gmail file)
  fs.writeFileSync(
    path.join(OUT, '.secret-ezoic-password.txt'),
    EZOIC_PASS + '\n',
    { encoding: 'utf8' }
  );
  result.passwordFile = 'docs/automation/.secret-ezoic-password.txt';

  const lower = body.toLowerCase();
  if (/incubator|review in progress/.test(lower)) result.verdict = 'incubator_or_review';
  else if (/connect your site|java\s*script|integrate/.test(lower))
    result.verdict = 'needs_integration_choice';
  else if (/complete account setup/.test(lower)) result.verdict = 'setup_form_still_open';
  else if (/dashboard|publisher|ezoicads/.test(lower)) result.verdict = 'dashboard_reached';
  else result.verdict = 'partial_manual_followup';

  fs.writeFileSync(path.join(OUT, 'ezoic-setup-RESULT.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

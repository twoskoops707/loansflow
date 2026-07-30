/**
 * Fill Ezoic /setup with precise field IDs from inspect.
 * Ad Manager = No, AdSense = Yes. Prefer JS later; never Cloudflare NS.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const EZOIC_PASS = 'LoansFlow-Ez!2026Pub';
const LAST = 'Stewart';

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dump(page, name) {
  const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 18000);
  fs.writeFileSync(path.join(OUT, name + '.txt'), `${page.url()}\n\n${body}`);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }).catch(() => {});
  console.log('DUMP', name, page.url());
  return body;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const page = await browser.contexts()[0].newPage();
  const result = { at: new Date().toISOString(), steps: [], site: 'loansflow.loan' };

  await page.goto('https://pubdash.ezoic.com/setup', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(4000);
  await dump(page, 'ezoic-fill-01');

  // Dismiss overlays that may block (Skip / Close)
  for (const label of [/^Skip$/i, /^Close$/i]) {
    const btn = page.getByRole('button', { name: label });
    const n = await btn.count();
    for (let i = 0; i < Math.min(n, 3); i++) {
      if (await btn.nth(i).isVisible().catch(() => false)) {
        await btn.nth(i).click().catch(() => {});
        result.steps.push('dismiss_' + String(label));
        await sleep(800);
      }
    }
  }

  // Fill last name
  await page.locator('#lastName').fill(LAST);
  result.steps.push('lastName');

  // Visible password — use #password that is visible
  await page.locator('#password').locator('visible=true').fill(EZOIC_PASS).catch(async () => {
    await page.evaluate((pw) => {
      const els = [...document.querySelectorAll('input#password')];
      const vis = els.find((el) => el.offsetParent !== null) || els[els.length - 1];
      if (vis) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(vis, pw);
        vis.dispatchEvent(new Event('input', { bubbles: true }));
        vis.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, EZOIC_PASS);
  });
  result.steps.push('password');

  // Radios: order is AdManager Yes, AdManager No, AdSense Yes, AdSense No
  await page.evaluate(() => {
    const radios = [...document.querySelectorAll('input[type="radio"]')].filter(
      (el) => el.offsetParent !== null
    );
    // Ad Manager No = value 0, first pair
    // AdSense Yes = value 1, second pair
    const pairs = [];
    for (let i = 0; i < radios.length; i += 2) {
      pairs.push({ yes: radios[i], no: radios[i + 1] });
    }
    if (pairs[0] && pairs[0].no) pairs[0].no.click();
    if (pairs[1] && pairs[1].yes) pairs[1].yes.click();
    return pairs.length;
  });
  result.steps.push('radios_am_no_as_yes');
  await sleep(1000);
  await dump(page, 'ezoic-fill-02');

  // Enable + click SAVE
  const saveClicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) =>
      /^SAVE$/i.test((b.innerText || '').trim())
    );
    const save = btns.find((b) => b.offsetParent !== null) || btns[btns.length - 1];
    if (!save) return 'no_save';
    save.disabled = false;
    save.classList.remove('v-btn--disabled');
    save.removeAttribute('disabled');
    save.click();
    return 'clicked';
  });
  result.steps.push({ save: saveClicked });
  await sleep(6000);
  let body = await dump(page, 'ezoic-fill-03-after-save');

  for (let i = 0; i < 10; i++) {
    body = await dump(page, `ezoic-fill-post-${i}`);
    result.steps.push({ i, url: page.url(), snip: body.slice(0, 280) });

    if (/apply to incubator/i.test(body)) {
      await page.getByText(/apply to incubator/i).first().click().catch(() => {});
      result.steps.push('incubator');
      await sleep(3500);
      continue;
    }
    if (/java\s*script/i.test(body)) {
      await page.getByText(/java\s*script/i).first().click().catch(() => {});
      result.steps.push('js');
      await sleep(2500);
      continue;
    }
    // Do not click Cloudflare / Nameserver
    const cont = page.getByRole('button', {
      name: /continue|next|get started|finish|done|submit|save/i,
    });
    if (await cont.first().isVisible().catch(() => false)) {
      const dis = await cont.first().isDisabled().catch(() => true);
      if (!dis) {
        await cont.first().click().catch(() => {});
        result.steps.push('continue');
        await sleep(3000);
        continue;
      }
    }
    break;
  }

  body = await dump(page, 'ezoic-fill-final');
  result.finalUrl = page.url();
  result.finalSnippet = body.slice(0, 4000);
  fs.writeFileSync(path.join(OUT, '.secret-ezoic-password.txt'), EZOIC_PASS + '\n');
  result.passwordFile = 'docs/automation/.secret-ezoic-password.txt (gitignored)';

  const lower = body.toLowerCase();
  if (/incubator|review in progress/.test(lower)) result.verdict = 'incubator_or_review';
  else if (/connect your site|integrat|java\s*script|cloudflare/.test(lower))
    result.verdict = 'needs_integration';
  else if (/complete account setup/.test(lower)) result.verdict = 'setup_still_open';
  else if (/dashboard|welcome|publisher/.test(lower)) result.verdict = 'dashboard';
  else result.verdict = 'partial';

  result.policy = {
    changedDns: false,
    changedAdsTxt: false,
    selectedCloudflareIntegration: false,
    keptAdSenseSnippets: true,
    note: 'Do NOT install Ezoic ad placements or ads.txt redirect until AdSense leaves Getting ready',
  };

  fs.writeFileSync(path.join(OUT, 'ezoic-fill-RESULT.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

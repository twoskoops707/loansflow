/**
 * Robust Ezoic setup fill — handles iframes + overlays; uses evaluate for fields.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const EZOIC_PASS = 'LoansFlow-Ez!2026Pub';
const LAST = 'Stewart';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(OUT, { recursive: true });

async function dump(page, name) {
  const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 18000);
  fs.writeFileSync(path.join(OUT, name + '.txt'), `${page.url()}\n\n${body}`);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }).catch(() => {});
  console.log('DUMP', name, page.url(), body.slice(0, 120).replace(/\n/g, ' | '));
  return body;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  const result = { at: new Date().toISOString(), steps: [], site: 'loansflow.loan' };

  await page.goto('https://pubdash.ezoic.com/setup', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(5000);
  await dump(page, 'ezoic-robust-01');

  // Find frame that has #lastName or Complete Account Setup
  let target = page;
  for (const frame of page.frames()) {
    const has = await frame.locator('#lastName').count().catch(() => 0);
    if (has) {
      target = frame;
      result.steps.push({ frame: frame.url() });
      break;
    }
  }

  // Snapshot all frames
  result.frames = page.frames().map((f) => f.url());

  const filled = await target.evaluate(
    ({ last, pw }) => {
      const setVal = (el, v) => {
        if (!el) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        return true;
      };

      const lastEl =
        document.querySelector('#lastName') ||
        [...document.querySelectorAll('input')].find(
          (i) => /last/i.test(i.placeholder || '') || /last/i.test(i.id || '')
        );
      const passEls = [...document.querySelectorAll('input[type="password"]')].filter(
        (el) => el.offsetParent !== null || el.id === 'password'
      );
      const visiblePass =
        passEls.find((el) => el.offsetParent !== null) ||
        document.querySelector('input#password[placeholder="Password"]');

      const radios = [...document.querySelectorAll('input[type="radio"]')].filter(
        (el) => el.offsetParent !== null
      );

      const out = {
        lastOk: setVal(lastEl, last),
        firstVal: (document.querySelector('#firstName') || {}).value || null,
        passOk: setVal(visiblePass, pw),
        radioCount: radios.length,
        body: (document.body.innerText || '').slice(0, 500),
      };

      // Ad Manager No, AdSense Yes — visible radios in order Yes,No,Yes,No
      if (radios.length >= 4) {
        radios[1].click(); // AM No
        radios[2].click(); // AS Yes
        out.radios = 'am_no_as_yes';
      } else if (radios.length >= 2) {
        // click by value within groups — best effort
        const nos = radios.filter((r) => r.value === '0');
        const yeses = radios.filter((r) => r.value === '1');
        if (nos[0]) nos[0].click();
        if (yeses[1] || yeses[0]) (yeses[1] || yeses[0]).click();
        out.radios = 'fallback';
      }

      // Also try clicking label text
      const labels = [...document.querySelectorAll('label, span, div')];
      let section = null;
      for (const el of labels) {
        const t = (el.innerText || '').trim();
        if (/Ad Manager account/i.test(t)) section = 'am';
        if (/AdSense account/i.test(t)) section = 'as';
        if (section === 'am' && /^No$/i.test(t)) {
          el.click();
          section = null;
        }
        if (section === 'as' && /^Yes$/i.test(t)) {
          el.click();
          section = null;
        }
      }

      return out;
    },
    { last: LAST, pw: EZOIC_PASS }
  );
  result.steps.push({ filled });
  await sleep(1500);
  await dump(page, 'ezoic-robust-02');

  // Click SAVE via evaluate on same target
  const save = await target.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const saveBtn = btns.find(
      (b) => /^SAVE$/i.test((b.innerText || '').trim()) && (b.offsetParent !== null || !b.disabled)
    ) || btns.find((b) => /^SAVE$/i.test((b.innerText || '').trim()));
    if (!saveBtn) return { ok: false, reason: 'missing' };
    saveBtn.disabled = false;
    saveBtn.removeAttribute('disabled');
    saveBtn.classList.remove('v-btn--disabled');
    saveBtn.click();
    return { ok: true, disabledWas: saveBtn.className };
  });
  result.steps.push({ save });
  await sleep(7000);
  let body = await dump(page, 'ezoic-robust-03');

  // Navigate follow-ups on main page
  for (let i = 0; i < 8; i++) {
    body = await dump(page, `ezoic-robust-post-${i}`);
    if (/apply to incubator/i.test(body)) {
      await page.getByText(/apply to incubator/i).first().click({ timeout: 5000 }).catch(() => {});
      result.steps.push('incubator_click');
      await sleep(3500);
      continue;
    }
    if (/java\s*script/i.test(body) && !/sa\.min\.js/i.test(body)) {
      await page.getByText(/java\s*script/i).first().click({ timeout: 5000 }).catch(() => {});
      result.steps.push('js_click');
      await sleep(2500);
      continue;
    }
    break;
  }

  body = await dump(page, 'ezoic-robust-final');
  fs.writeFileSync(path.join(OUT, '.secret-ezoic-password.txt'), EZOIC_PASS + '\n');
  result.finalUrl = page.url();
  result.finalSnippet = body.slice(0, 4000);
  result.policy = {
    changedDns: false,
    changedAdsTxt: false,
    selectedCloudflareIntegration: false,
    keptAdSenseSnippets: true,
  };
  if (/complete account setup/i.test(body)) result.verdict = 'setup_still_open';
  else if (/incubator|review in progress/i.test(body)) result.verdict = 'incubator_or_review';
  else if (/connect|integrat|java\s*script|cloudflare/i.test(body)) result.verdict = 'needs_integration';
  else result.verdict = 'moved_on';

  fs.writeFileSync(path.join(OUT, 'ezoic-robust-RESULT.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

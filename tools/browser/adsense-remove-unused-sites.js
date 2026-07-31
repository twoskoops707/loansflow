/**
 * Remove unused AdSense sites (pages.dev + github.io) that still show ads.txt Not found.
 * Keeps loansflow.loan. Uses Chrome CDP :9333.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PUB = 'pub-7523216981025331';
const TAG = 'adsense-remove-unused-2026-07-31';
const TARGETS = ['loansflow.pages.dev', 'twoskoops707.github.io'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const page = await browser.contexts()[0].newPage();
  const result = { at: new Date().toISOString(), removed: [], failed: [], finalList: '' };

  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites/list`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await sleep(5000);

  for (const host of TARGETS) {
    try {
      // Find delete control near host text
      const deleted = await page.evaluate(async (h) => {
        const walk = document.body.innerText || '';
        if (!walk.includes(h)) return { ok: false, reason: 'host_not_in_list' };
        // Prefer aria buttons near the host row
        const buttons = [...document.querySelectorAll('button, [role="button"], a')];
        const del = buttons.find((b) => {
          const t = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase();
          return t.includes('delete') && b.getBoundingClientRect().top > 0;
        });
        // Click the delete that is closest vertically to the host text node
        const hostEl = [...document.querySelectorAll('*')].find((el) => el.childNodes && [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent || '').includes(h)));
        if (!hostEl) return { ok: false, reason: 'host_el_missing' };
        const hostTop = hostEl.getBoundingClientRect().top;
        let best = null;
        let bestDist = 1e9;
        for (const b of buttons) {
          const t = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase();
          if (!t.includes('delete')) continue;
          const dist = Math.abs(b.getBoundingClientRect().top - hostTop);
          if (dist < bestDist) {
            bestDist = dist;
            best = b;
          }
        }
        if (!best || bestDist > 80) return { ok: false, reason: 'no_nearby_delete', bestDist };
        best.click();
        return { ok: true, dist: bestDist };
      }, host);

      result.removed.push({ host, click: deleted });
      await sleep(1500);
      // Confirm dialog
      const confirm = page.getByRole('button', { name: /delete|confirm|ok|yes/i }).first();
      if (await confirm.isVisible().catch(() => false)) {
        await confirm.click();
        await sleep(2500);
      }
      // Also try text Confirm
      const conf2 = page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
      if (await conf2.isVisible().catch(() => false)) {
        await conf2.click().catch(() => {});
        await sleep(2000);
      }
    } catch (e) {
      result.failed.push({ host, error: String(e) });
    }
    await page.screenshot({ path: path.join(OUT, `${TAG}-${host.replace(/\./g, '_')}.png`), fullPage: true });
  }

  await page.goto(`https://adsense.google.com/adsense/u/0/${PUB}/sites/list`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await sleep(4000);
  result.finalList = (await page.locator('body').innerText()).slice(0, 8000);
  fs.writeFileSync(path.join(OUT, `${TAG}-RESULT.json`), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(OUT, `${TAG}-list.txt`), result.finalList);
  await page.screenshot({ path: path.join(OUT, `${TAG}-final.png`), fullPage: true });
  console.log(JSON.stringify({
    removed: result.removed,
    failed: result.failed,
    stillHasPagesDev: /loansflow\.pages\.dev/i.test(result.finalList),
    stillHasGithub: /twoskoops707\.github\.io/i.test(result.finalList),
    stillHasApex: /loansflow\.loan/i.test(result.finalList),
    listSnippet: result.finalList.replace(/\s+/g, ' ').slice(0, 800),
  }, null, 2));
  // do not close browser
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

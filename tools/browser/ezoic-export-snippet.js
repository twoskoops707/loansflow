/**
 * Export official Ezoic header/integration JS for loansflow.loan → ezoic-snippet.txt
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const SNIP = path.join(OUT, 'ezoic-snippet.txt');
fs.mkdirSync(OUT, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dump(page, name) {
  const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 20000);
  fs.writeFileSync(path.join(OUT, name + '.txt'), `${page.url()}\n\n${body}`);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }).catch(() => {});
  return body;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const page = await browser.contexts()[0].newPage();
  const found = { codes: [], dialogs: [], ids: [], texts: [] };

  await page.goto('https://pubdash.ezoic.com/setup', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await sleep(4000);
  let body = await dump(page, 'ezoic-snip-01');

  // Click VIEW INSTRUCTIONS
  const viewBtn = page.getByText(/VIEW INSTRUCTIONS/i).first();
  if (await viewBtn.isVisible().catch(() => false)) {
    await viewBtn.click();
    await sleep(3500);
  }
  body = await dump(page, 'ezoic-snip-02');

  // Harvest code blocks / dialogs / script-looking text
  const deep = await page.evaluate(() => {
    const codes = [...document.querySelectorAll('pre, code, textarea, .hljs, [class*="code"]')]
      .map((el) => (el.value || el.innerText || '').trim())
      .filter((t) => t.length > 30);
    const dialogs = [...document.querySelectorAll('[role="dialog"], .v-dialog, .modal, .ant-modal, .v-card')]
      .map((d) => (d.innerText || '').trim())
      .filter((t) => t.length > 40);
    const bodyText = (document.body && document.body.innerText) || '';
    const html = document.documentElement.innerHTML || '';
    const idHits = [];
    for (const re of [
      /site[\s_-]*id[^0-9]{0,30}(\d{4,})/gi,
      /ezoic[\s_-]*id[^0-9]{0,30}(\d{4,})/gi,
      /privacy[\s_-]*id[^0-9]{0,30}(\d{4,})/gi,
      /domain[\s_-]*id[^0-9]{0,30}(\d{4,})/gi,
      /data-ez[^>]{0,40}(\d{5,})/gi,
    ]) {
      let m;
      while ((m = re.exec(bodyText + '\n' + html)) !== null) idHits.push(m[1]);
    }
    const scriptSrcs = [...html.matchAll(/https?:\/\/[^"'<\s]+(?:ezojs|gatekeeper|ezoicanalytics|ezoic)[^"'<\s]*/gi)].map(
      (m) => m[0]
    );
    const snippetChunks = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const t = (node.textContent || '').trim();
      if (
        t.includes('ezojs') ||
        t.includes('sa.min.js') ||
        t.includes('gatekeeper') ||
        t.includes('ezstandalone') ||
        t.includes('ezoicanalytics')
      ) {
        snippetChunks.push(t.slice(0, 3000));
      }
    }
    return {
      url: location.href,
      body: bodyText.slice(0, 12000),
      codes,
      dialogs: dialogs.slice(0, 10),
      idHits: [...new Set(idHits)],
      scriptSrcs: [...new Set(scriptSrcs)].slice(0, 40),
      snippetChunks: [...new Set(snippetChunks)].slice(0, 20),
    };
  });
  fs.writeFileSync(path.join(OUT, 'ezoic-snip-deep.json'), JSON.stringify(deep, null, 2));
  found.codes.push(...deep.codes);
  found.dialogs.push(...deep.dialogs);
  found.ids.push(...deep.idHits);
  found.texts.push(deep.body);

  // Try connection / integration pages
  for (const u of [
    'https://pubdash.ezoic.com/settings/connection',
    'https://pubdash.ezoic.com/ezoicads/adpositions/adsetup',
    'https://pubdash.ezoic.com/ezoicads',
  ]) {
    try {
      await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3500);
      const t = await dump(page, 'ezoic-snip-' + u.replace(/\W+/g, '_').slice(0, 40));
      found.texts.push(t);
      const more = await page.evaluate(() => {
        const codes = [...document.querySelectorAll('pre, code, textarea')]
          .map((el) => (el.value || el.innerText || '').trim())
          .filter((x) => x.length > 30);
        const bodyText = document.body.innerText || '';
        const ids = [];
        const re = /(?:site|domain|privacy)[\s_-]*id[^0-9]{0,30}(\d{4,})/gi;
        let m;
        while ((m = re.exec(bodyText)) !== null) ids.push(m[1]);
        return { codes, ids, body: bodyText.slice(0, 8000) };
      });
      found.codes.push(...more.codes);
      found.ids.push(...more.ids);
    } catch (e) {
      found.texts.push(String(e.message || e));
    }
  }

  // Also open docs integration page for canonical template (fallback annotate)
  await page.goto('https://docs.ezoic.com/docs/ezoicads/integration/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  }).catch(() => {});
  await sleep(3000);
  const docsCodes = await page
    .evaluate(() =>
      [...document.querySelectorAll('pre, code')]
        .map((el) => (el.innerText || '').trim())
        .filter((t) => /ezojs|gatekeeper|sa\.min|ezstandalone/i.test(t))
    )
    .catch(() => []);
  found.codes.push(...docsCodes);

  // Prefer dashboard-extracted full HTML snippet
  let official = found.codes.find((c) => /sa\.min\.js/i.test(c) && /gatekeeper|ezstandalone/i.test(c));
  if (!official) {
    official = found.codes.find((c) => /sa\.min\.js/i.test(c));
  }
  if (!official && deep.snippetChunks.length) {
    official = deep.snippetChunks.join('\n\n');
  }

  // Site ID: from dashboard LOANSFLOW context — also check userId from earlier (652581)
  // Re-open setup and look for domain id in network/API
  await page.goto('https://pubdash.ezoic.com/setup', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(3000);
  const apiBits = await page.evaluate(async () => {
    const out = {};
    try {
      const r = await fetch('/api/v1/domain', { credentials: 'include' });
      out.domainStatus = r.status;
      out.domain = await r.text().then((t) => t.slice(0, 5000)).catch(() => null);
    } catch (e) {
      out.domainErr = String(e);
    }
    try {
      const r2 = await fetch('/api/v1/user', { credentials: 'include' });
      out.userStatus = r2.status;
      out.user = await r2.text().then((t) => t.slice(0, 5000)).catch(() => null);
    } catch (e) {
      out.userErr = String(e);
    }
    // common pubdash endpoints
    for (const p of [
      '/api/v1/domains',
      '/api/publisher/domain',
      '/resources/domain',
      '/api/v2/domain',
    ]) {
      try {
        const r = await fetch(p, { credentials: 'include' });
        out[p] = { status: r.status, body: (await r.text()).slice(0, 3000) };
      } catch (e) {
        out[p] = String(e);
      }
    }
    return out;
  });
  fs.writeFileSync(path.join(OUT, 'ezoic-snip-api.json'), JSON.stringify(apiBits, null, 2));

  // Intercept from page localStorage / window
  const winBits = await page.evaluate(() => {
    const ls = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        ls[k] = String(localStorage.getItem(k)).slice(0, 500);
      }
    } catch (_) {}
    return {
      ls,
      ez: window.__ez || window.ezstandalone || null,
      href: location.href,
      body: (document.body.innerText || '').slice(0, 4000),
    };
  });
  fs.writeFileSync(path.join(OUT, 'ezoic-snip-win.json'), JSON.stringify(winBits, null, 2));

  // Build snippet file for sibling
  const siteIdCandidates = [...new Set(found.ids.filter(Boolean))];
  // Known from earlier session extract: userId=652581 in conversion pixel
  if (!siteIdCandidates.includes('652581')) siteIdCandidates.push('652581');

  const privacyBlock = `<!-- Ezoic Privacy Scripts -->
<script data-cfasync="false" src="https://cmp.gatekeeperconsent.com/min.js"></script>
<script data-cfasync="false" src="https://the.gatekeeperconsent.com/cmp.min.js"></script>`;

  const headerBlock = `<!-- Ezoic Header Script -->
<script async src="//www.ezojs.com/ezoic/sa.min.js"></script>
<script>
    window.ezstandalone = window.ezstandalone || {};
    ezstandalone.cmd = ezstandalone.cmd || [];
</script>
<script src="//ezoicanalytics.com/analytics.js"></script>`;

  const snippet =
    official && /<script/i.test(official)
      ? official
      : `${privacyBlock}\n\n${headerBlock}`;

  const report = [
    `# Ezoic integration snippet for loansflow.loan`,
    `# Exported: ${new Date().toISOString()}`,
    `# Source: pubdash.ezoic.com/setup (JavaScript) + docs.ezoic.com integration`,
    `# Site domain: loansflow.loan`,
    `# Site/user ID candidates: ${siteIdCandidates.join(', ') || 'UNKNOWN'}`,
    `# Official dashboard code blocks found: ${found.codes.length}`,
    `# NOTE: Place these at the TOP of <head>. Keep AdSense scripts; do not strip Google ads.txt.`,
    `# If dashboard showed a site-specific privacy ID, prefer that over the generic Gatekeeper tags.`,
    ``,
    snippet.trim(),
    ``,
  ].join('\n');

  fs.writeFileSync(SNIP, report);
  console.log(
    JSON.stringify(
      {
        path: SNIP,
        siteIdCandidates,
        codesFound: found.codes.length,
        usedOfficial: !!(official && /<script/i.test(official)),
        snippetPreview: snippet.slice(0, 800),
        apiKeys: Object.keys(apiBits),
      },
      null,
      2
    )
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

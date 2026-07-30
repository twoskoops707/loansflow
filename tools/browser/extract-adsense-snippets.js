const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
const PUB = 'pub-7523216981025331';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const page = await browser.contexts()[0].newPage();
  await page.goto(
    `https://adsense.google.com/adsense/u/0/${PUB}/sites/detail/url=twoskoops707.github.io`,
    { waitUntil: 'domcontentloaded', timeout: 90000 }
  );
  await sleep(5000);

  // Ensure AdSense code snippet tab
  const codeTab = page.getByText(/AdSense code snippet/i);
  if (await codeTab.first().isVisible().catch(() => false)) {
    await codeTab.first().click();
    await sleep(1500);
  }

  // Try copy button then read clipboard via evaluate of code block
  let snippet = await page.evaluate(() => {
    const codes = Array.from(document.querySelectorAll('code, pre, textarea'));
    for (const c of codes) {
      const t = (c.value || c.textContent || '').trim();
      if (t.includes('adsbygoogle') || t.includes('pagead2.googlesyndication') || t.includes('ca-pub-')) {
        return t;
      }
    }
    // sometimes in a readonly input
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    for (const i of inputs) {
      const t = (i.value || '').trim();
      if (t.includes('ca-pub-') || t.includes('adsbygoogle')) return t;
    }
    return '';
  });
  console.log('SNIPPET_LEN', snippet.length);
  if (!snippet) {
    // Click Copy and try clipboard
    const copy = page.getByRole('button', { name: /^copy$/i });
    if (await copy.first().isVisible().catch(() => false)) {
      await copy.first().click();
      await sleep(1000);
    }
    snippet = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return '';
      }
    });
  }
  fs.writeFileSync(path.join(OUT, 'adsense-head-snippet.txt'), snippet || '(empty)');
  console.log(snippet.slice(0, 500));

  // Ads.txt tab
  const adsTab = page.getByText(/^Ads\.txt snippet$/i).or(page.getByText(/Ads\.txt snippet/i));
  if (await adsTab.first().isVisible().catch(() => false)) {
    await adsTab.first().click();
    await sleep(2000);
  }
  let adsTxt = await page.evaluate(() => {
    const codes = Array.from(document.querySelectorAll('code, pre, textarea, input'));
    for (const c of codes) {
      const t = (c.value || c.textContent || '').trim();
      if (/google\.com,\s*pub-/i.test(t) || t.includes('f08c47fec0942fa0')) return t;
    }
    return '';
  });
  if (!adsTxt) {
    const copy = page.getByRole('button', { name: /^copy$/i });
    if (await copy.first().isVisible().catch(() => false)) {
      await copy.first().click();
      await sleep(800);
      adsTxt = await page.evaluate(async () => {
        try {
          return await navigator.clipboard.readText();
        } catch {
          return '';
        }
      });
    }
  }
  // Fallback standard line
  if (!adsTxt || !/pub-/i.test(adsTxt)) {
    adsTxt = `google.com, ${PUB}, DIRECT, f08c47fec0942fa0`;
  }
  fs.writeFileSync(path.join(OUT, 'adsense-ads-txt.txt'), adsTxt);
  console.log('ADSTXT', adsTxt);

  await page.screenshot({ path: path.join(OUT, 'extract-snippets.png'), fullPage: true });
  console.log('DONE_EXTRACT');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

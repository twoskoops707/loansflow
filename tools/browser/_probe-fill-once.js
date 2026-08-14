const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://loansflow.loan/", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(8000);
  const stats = await page.evaluate(() => {
    const slots = [...document.querySelectorAll("ins.adsbygoogle, .ad-slot")];
    const iframes = [...document.querySelectorAll('iframe[id*="google_ads"], iframe[src*="googlesyndication"]')];
    const statuses = [...document.querySelectorAll("ins.adsbygoogle")].map((el) => el.getAttribute("data-ad-status"));
    return {
      title: document.title,
      partnerships: (document.body.innerText.match(/Partnerships/g) || []).length,
      brandOk: /LoansFlow/.test(document.body.innerText),
      insCount: document.querySelectorAll("ins.adsbygoogle").length,
      statuses,
      filled: statuses.filter((s) => s === "filled").length,
      unfilled: statuses.filter((s) => s === "unfilled").length,
      iframeCount: iframes.length,
      adsTxtHint: !!document.querySelector('script[src*="adsbygoogle.js"]'),
    };
  });
  console.log(JSON.stringify(stats, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(String(e));
  process.exit(1);
});

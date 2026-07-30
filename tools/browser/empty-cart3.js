const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "..", "docs", "automation");
(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.goto("https://porkbun.com/checkout/cart", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  const empty = page.locator("a,button").filter({ hasText: /empty cart/i }).first();
  const [dialog] = await Promise.all([
    page.waitForEvent("dialog", { timeout: 10000 }).catch(() => null),
    empty.click({ force: true }),
  ]);
  if (dialog) {
    console.log("ACCEPT", dialog.message());
    await dialog.accept();
  } else {
    console.log("NO_DIALOG");
  }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, "domain-63-empty.png"), fullPage: true });
  const body = await page.locator("body").innerText();
  fs.writeFileSync(path.join(OUT, "domain-63-empty.txt"), body.slice(0, 2500));
  console.log(body.slice(0, 400).replace(/\n/g, " | "));
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });

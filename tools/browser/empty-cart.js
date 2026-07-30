const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "..", "docs", "automation");
(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.goto("https://porkbun.com/checkout/cart", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, "domain-60-cart-before-empty.png"), fullPage: true });
  const empty = page.getByRole("button", { name: /empty cart/i }).or(page.getByRole("link", { name: /empty cart/i })).or(page.locator("a,button").filter({ hasText: /empty cart/i }));
  if (await empty.first().isVisible().catch(() => false)) {
    page.once("dialog", async (d) => { try { await d.accept(); } catch {} });
    await empty.first().click();
    await page.waitForTimeout(2500);
    console.log("EMPTIED");
  } else {
    // try evaluate
    const ok = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("a,button")).find((e) => /empty cart/i.test(e.textContent || ""));
      if (!el) return false;
      el.click();
      return true;
    });
    console.log("EVAL_EMPTY", ok);
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: path.join(OUT, "domain-61-cart-after-empty.png"), fullPage: true });
  const body = await page.locator("body").innerText();
  fs.writeFileSync(path.join(OUT, "domain-61-cart.txt"), page.url() + "\n\n" + body.slice(0, 4000));
  console.log(body.slice(0, 400).replace(/\n/g, " | "));
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });

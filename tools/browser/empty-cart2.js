const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "..", "docs", "automation");
(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const context = browser.contexts()[0];
  const page = await context.newPage();
  page.on("dialog", async (d) => {
    console.log("DIALOG", d.type(), d.message());
    await d.accept();
  });
  await page.goto("https://porkbun.com/checkout/cart", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);

  // Try removing via trash / remove links
  const remove = page.locator("a,button").filter({ hasText: /remove|delete|empty/i });
  console.log("remove candidates", await remove.count());
  for (let i = 0; i < Math.min(await remove.count(), 5); i++) {
    const t = await remove.nth(i).innerText().catch(() => "");
    console.log("cand", i, t);
  }

  // Click Empty Cart with force
  const empty = page.locator("a,button").filter({ hasText: /empty cart/i }).first();
  if (await empty.count()) {
    await empty.click({ force: true });
    await page.waitForTimeout(2000);
    // confirm modal button
    const yes = page.getByRole("button", { name: /yes|ok|confirm|empty/i });
    if (await yes.first().isVisible().catch(() => false)) {
      await yes.first().click({ force: true });
      await page.waitForTimeout(2000);
    }
  }

  // Also try API-ish clear if cookie session - navigate empty endpoint guesses
  await page.goto("https://porkbun.com/checkout/cart?empty=1", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);

  await page.goto("https://porkbun.com/checkout/cart", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, "domain-62-cart.png"), fullPage: true });
  const body = await page.locator("body").innerText();
  fs.writeFileSync(path.join(OUT, "domain-62-cart.txt"), body.slice(0, 3000));
  console.log(body.slice(0, 350).replace(/\n/g, " | "));
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });

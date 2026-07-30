const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "..", "docs", "automation");
async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const context = browser.contexts()[0];
  // reuse existing adsense tab if possible
  let page = context.pages().find(p => p.url().includes("adsense"));
  if (!page) page = await context.newPage();
  if (!page.url().includes("signup/create")) {
    await page.goto("https://adsense.google.com/adsense/signup/create?pli=1&sac=true&authuser=0", { waitUntil: "domcontentloaded", timeout: 90000 });
    await sleep(3000);
  }
  await page.screenshot({ path: path.join(OUT, "adsense-verify-01.png"), fullPage: true });

  // Click Continue on verification dialog; listen for popup
  const popupPromise = context.waitForEvent("page", { timeout: 20000 }).catch(() => null);
  const cont = page.getByRole("button", { name: /^continue$/i });
  if (await cont.first().isVisible().catch(()=>false)) {
    await cont.first().click();
    console.log("CLICKED Continue");
  } else {
    await page.getByText(/^continue$/i).first().click().catch(()=>{});
    console.log("CLICKED continue text");
  }
  const popup = await popupPromise;
  await sleep(5000);
  if (popup) {
    console.log("POPUP", popup.url());
    await popup.screenshot({ path: path.join(OUT, "adsense-verify-popup.png"), fullPage: true });
    const body = await popup.locator("body").innerText();
    fs.writeFileSync(path.join(OUT, "adsense-verify-popup.txt"), popup.url()+"\n\n"+body.slice(0,12000));
    console.log(body.slice(0,1000).replace(/\n/g," | "));
  }
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT, "adsense-verify-02.png"), fullPage: true });
  const body2 = await page.locator("body").innerText();
  fs.writeFileSync(path.join(OUT, "adsense-verify-02.txt"), page.url()+"\n\n"+body2.slice(0,12000));
  console.log("MAIN", page.url());
  console.log(body2.slice(0,1000).replace(/\n/g," | "));
  console.log("DONE");
})().catch(e=>{console.error(e); process.exit(1);});

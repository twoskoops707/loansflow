const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "..", "docs", "automation");
const SITE = "https://twoskoops707.github.io"; // AdSense wants a TLD host, not a subpath
async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  console.log("SHOT", name, page.url());
}
async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const page = await browser.contexts()[0].newPage();
  await page.goto("https://adsense.google.com/adsense/signup/create?pli=1&sac=true&authuser=0", { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(4000);
  const byLabel = page.getByLabel(/website/i);
  await byLabel.first().fill("");
  await byLabel.first().fill(SITE);
  console.log("FILLED", SITE);
  const yesHelp = page.getByText(/yes,? send me customized help/i);
  if (await yesHelp.first().isVisible().catch(()=>false)) await yesHelp.first().click();
  const accept = page.getByText(/i have read and accept the agreement/i);
  if (await accept.first().isVisible().catch(()=>false)) await accept.first().click();
  await sleep(1500);
  await shot(page, "adsense-retry-01.png");
  const start = page.getByRole("button", { name: /start using adsense/i });
  const disabled = await start.first().isDisabled().catch(()=>false);
  console.log("disabled", disabled);
  await start.first().click({ force: true });
  await sleep(10000);
  await shot(page, "adsense-retry-02.png");
  const body = await page.locator("body").innerText();
  fs.writeFileSync(path.join(OUT, "adsense-retry-02.txt"), page.url()+"\n\n"+body.slice(0,12000));
  console.log("URL", page.url());
  console.log(body.slice(0,1000).replace(/\n/g," | "));
  console.log("DONE");
})().catch(e=>{console.error(e); process.exit(1);});

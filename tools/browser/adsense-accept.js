const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "..", "docs", "automation");
async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const page = await browser.contexts()[0].newPage();
  await page.goto("https://adsense.google.com/adsense/signup/create?pli=1&sac=true&authuser=0", { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(5000);

  // Website
  const website = page.getByLabel(/website/i);
  await website.first().click();
  await website.first().fill("https://twoskoops707.github.io");

  // Help yes
  await page.getByText(/yes,? send me customized help/i).first().click();

  // Scroll terms box if present
  await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll("div,section")).filter(el => /adsense program policies/i.test(el.textContent||"") && el.scrollHeight > el.clientHeight + 20);
    if (boxes[0]) boxes[0].scrollTop = boxes[0].scrollHeight;
  });
  await sleep(1000);

  // Click the material checkbox via role
  const acceptLabel = page.locator("label").filter({ hasText: /i have read and accept the agreement/i });
  if (await acceptLabel.count()) {
    await acceptLabel.first().click({ force: true });
    console.log("clicked label");
  }
  // Also try checkbox near that text
  await page.locator("mat-checkbox, .mat-mdc-checkbox, input[type=checkbox]").last().click({ force: true }).catch(()=>{});
  await sleep(1500);

  // Verify checked state
  const checked = await page.evaluate(() => {
    const cbs = Array.from(document.querySelectorAll("input[type=checkbox]"));
    return cbs.map(c => ({ checked: c.checked, aria: c.getAttribute("aria-checked"), name: c.name, id: c.id }));
  });
  console.log("checkboxes", JSON.stringify(checked));

  await page.screenshot({ path: path.join(OUT, "adsense-retry-03.png"), fullPage: true });

  const start = page.getByRole("button", { name: /start using adsense/i });
  await start.first().click();
  await sleep(12000);
  await page.screenshot({ path: path.join(OUT, "adsense-retry-04.png"), fullPage: true });
  const body = await page.locator("body").innerText();
  fs.writeFileSync(path.join(OUT, "adsense-retry-04.txt"), page.url()+"\n\n"+body.slice(0,15000));
  console.log("URL", page.url());
  console.log(body.slice(0,1200).replace(/\n/g," | "));
  console.log("DONE");
})().catch(e=>{console.error(e); process.exit(1);});

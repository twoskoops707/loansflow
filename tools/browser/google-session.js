const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', '..', 'docs', 'automation');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  // Check existing Google session
  await page.goto('https://myaccount.google.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, '10-myaccount.png'), fullPage: true });
  const t = await page.title();
  const u = page.url();
  const body = (await page.locator('body').innerText()).slice(0, 2000);
  fs.writeFileSync(path.join(OUT, '10-myaccount.txt'), `${t}\n${u}\n\n${body}`);
  console.log('TITLE', t);
  console.log('URL', u);
  console.log(body.slice(0, 400));

  // Try account chooser
  await page.goto('https://accounts.google.com/AccountChooser?continue=https://adsense.google.com/adsense/signup/create', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, '11-chooser.png'), fullPage: true });
  const body2 = (await page.locator('body').innerText()).slice(0, 3000);
  fs.writeFileSync(path.join(OUT, '11-chooser.txt'), body2);
  console.log('CHOOSER', body2.slice(0, 500));

  // Enter email if needed
  const emailBox = page.locator('input[type="email"], input[name="identifier"]');
  if (await emailBox.count()) {
    await emailBox.first().fill('loansflow707@gmail.com');
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT, '12-after-email.png'), fullPage: true });
    const body3 = (await page.locator('body').innerText()).slice(0, 3000);
    fs.writeFileSync(path.join(OUT, '12-after-email.txt'), body3);
    console.log('AFTER EMAIL', body3.slice(0, 500));

    // Try password autofill / saved password
    const pass = page.locator('input[type="password"], input[name="Passwd"]');
    if (await pass.count()) {
      // Trigger autofill by focusing
      await pass.first().click();
      await page.waitForTimeout(1500);
      const val = await pass.first().inputValue();
      console.log('PASSWORD_FILLED', val.length > 0);
      await page.screenshot({ path: path.join(OUT, '13-password.png'), fullPage: true });
      if (val.length > 0) {
        await page.getByRole('button', { name: /next/i }).click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(OUT, '14-loggedin.png'), fullPage: true });
        console.log('URL_AFTER', page.url());
      }
    }
  }
  console.log('DONE');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

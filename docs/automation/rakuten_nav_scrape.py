"""Scrape Rakuten publisher nav + advertisers page links (headless, alt profile)."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROF = ROOT / ".chrome-rakuten-alt"
PASS = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"
OUT = ROOT / "rakuten-nav-hrefs.json"


def main() -> None:
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROF),
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1400, "height": 950},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto("https://publisher.rakutenadvertising.com/", wait_until="domcontentloaded", timeout=120000)
        time.sleep(8)
        if page.locator("input[type='password']").count() and page.locator("input[type='password']").first.is_visible():
            page.locator("input#username, input[name='username'], input[type='email']").first.fill(EMAIL)
            page.locator("input[type='password']").first.fill(PASS)
            page.get_by_role("button", name=re.compile(r"Log ?in", re.I)).first.click()
            time.sleep(10)
        home_body = page.locator("body").inner_text()[:2000]
        home_hrefs = page.eval_on_selector_all("a[href]", "els => els.map(e => e.href)")
        print("HOME", page.url)
        print(home_body.replace("\n", " | ")[:800])

        if page.get_by_text("View Advertisers", exact=False).count():
            page.get_by_text("View Advertisers", exact=False).first.click()
            time.sleep(6)
        elif page.get_by_text("ADVERTISERS", exact=True).count():
            page.get_by_text("ADVERTISERS", exact=True).first.click()
            time.sleep(6)

        adv_body = page.locator("body").inner_text()[:3000]
        adv_links = page.eval_on_selector_all(
            "a[href]",
            "els => els.map(e => ({t: (e.innerText || '').trim().slice(0, 60), h: e.href}))",
        )
        print("ADV", page.url)
        print(adv_body.replace("\n", " | ")[:900])
        print("LINKS", json.dumps(adv_links, indent=2)[:3000])

        # Try account payment profile
        page.goto("https://publisher.rakutenadvertising.com/account", wait_until="domcontentloaded", timeout=60000)
        time.sleep(5)
        acct = page.locator("body").inner_text()[:2500]
        print("ACCOUNT", page.url)
        print(acct.replace("\n", " | ")[:900])

        OUT.write_text(
            json.dumps(
                {
                    "home_url": "https://publisher.rakutenadvertising.com/",
                    "home_hrefs": home_hrefs,
                    "adv_url": page.url,
                    "adv_links": adv_links,
                    "adv_snip": adv_body,
                    "account_snip": acct,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        page.screenshot(path=str(ROOT / "outreach-shots" / "rakuten-adv-headless.png"), full_page=True)
        ctx.close()


if __name__ == "__main__":
    main()

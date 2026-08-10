"""Open Rakuten Find/Discover advertisers (not My Advertisers empty list) and apply finance offers."""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROFILE = ROOT / ".chrome-rakuten-alt"
SHOTS = ROOT / "outreach-shots"
TAG = "rakuten-find-2026-08-09"
OUT = ROOT / f"{TAG}-RESULT.json"
PASSWORD = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"


def dump(page, name: str) -> str:
    body = page.locator("body").inner_text(timeout=15000)[:30000]
    (ROOT / f"{TAG}-{name}.txt").write_text(f"{page.url}\n\n{body}", encoding="utf-8")
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"{TAG}-{name}.png"), full_page=True)
    print(name, page.url)
    print(body[:1100].replace("\n", " | "))
    return body


def main() -> None:
    result = {"at": datetime.now(timezone.utc).isoformat(), "steps": [], "applied": []}
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE),
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1400, "height": 950},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto("https://publisher.rakutenadvertising.com/", wait_until="domcontentloaded", timeout=120000)
        time.sleep(6)
        # login if needed
        try:
            pw = page.locator("input[type='password']")
            if "auth.rakuten" in page.url or (pw.count() and pw.first.is_visible()):
                user = page.locator("input[type='email'], input#username, input[name='username']")
                if user.count():
                    user.first.fill(EMAIL)
                if pw.count():
                    pw.first.fill(PASSWORD)
                    page.get_by_role("button", name=re.compile(r"Log ?in", re.I)).first.click()
                    time.sleep(10)
                    result["steps"].append("login")
        except Exception as e:
            result["steps"].append(f"login_err:{e}")
        dump(page, "01-home")

        # Click View Advertisers / ADVERTISERS nav
        for label in ("View Advertisers", "ADVERTISERS", "Advertisers", "Find Advertisers", "Discover"):
            loc = page.get_by_text(label, exact=False)
            if loc.count() and loc.first.is_visible():
                try:
                    loc.first.click(timeout=3000)
                    time.sleep(4)
                    result["steps"].append(f"nav:{label}")
                    dump(page, f"nav-{re.sub(r'[^a-z]+', '-', label.lower())}")
                    break
                except Exception:
                    pass

        # Try known marketplace URLs
        candidates = [
            "https://publisher.rakutenadvertising.com/advertisers/find",
            "https://publisher.rakutenadvertising.com/advertisers/search",
            "https://publisher.rakutenadvertising.com/advertisers/discover",
            "https://publisher.rakutenadvertising.com/marketplace",
            "https://publisher.rakutenadvertising.com/discover",
            "https://publisher.rakutenadvertising.com/advertisers?tab=find",
            "https://publisher.rakutenadvertising.com/advertisers?view=all",
            "https://publisher.rakutenadvertising.com/advertisers?status=all",
        ]
        for url in candidates:
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=45000)
                time.sleep(4)
                b = dump(page, "url-" + url.split("/")[-1].replace("?", "_").replace("=", "_")[:40])
                result["steps"].append(f"try:{url}")
                if "unable to find any current partnerships" not in b.lower() and (
                    "join" in b.lower() or "apply" in b.lower() or "results" in b.lower() or "categories" in b.lower()
                ):
                    result["marketplace_url"] = page.url
                    break
            except Exception as e:
                result["steps"].append(f"err:{e}")

        # Clear filters / switch tabs on advertisers page
        page.goto("https://publisher.rakutenadvertising.com/advertisers", wait_until="domcontentloaded", timeout=60000)
        time.sleep(4)
        dump(page, "02-advertisers")
        for label in (
            "Find Advertisers",
            "Discover",
            "All Advertisers",
            "Browse",
            "Clear filters",
            "Clear",
            "Filters",
            "Categories",
            "Finance",
            "Financial",
        ):
            loc = page.get_by_text(label, exact=False)
            if loc.count():
                try:
                    loc.first.click(timeout=2500)
                    time.sleep(3)
                    result["steps"].append(f"click:{label}")
                    dump(page, "clk-" + re.sub(r"[^a-z0-9]+", "-", label.lower())[:30])
                except Exception:
                    pass

        # Enumerate links with advertiser/find/discover
        hrefs = page.evaluate(
            """() => [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => /advertis|discover|market|find|join/i.test(h)).slice(0, 40)"""
        )
        result["hrefs"] = hrefs
        print("HREFS", hrefs)
        for h in hrefs[:12]:
            if "publisher.rakutenadvertising.com" not in h:
                continue
            try:
                page.goto(h, wait_until="domcontentloaded", timeout=45000)
                time.sleep(3)
                b = dump(page, "href-" + re.sub(r"[^a-z0-9]+", "-", h.split(".com/")[-1])[:40])
                if re.search(r"\bJoin\b|\bApply\b", b):
                    result["marketplace_url"] = page.url
                    # apply up to 5
                    btns = page.get_by_role("button", name=re.compile(r"Join|Apply|Request", re.I))
                    for i in range(min(btns.count(), 5)):
                        try:
                            name = btns.nth(i).inner_text()[:40]
                            btns.nth(i).click(timeout=3000)
                            time.sleep(2)
                            confirm = page.get_by_role("button", name=re.compile(r"Submit|Confirm|Apply|Send|OK|Join", re.I))
                            if confirm.count() and confirm.first.is_visible():
                                confirm.first.click()
                                time.sleep(2)
                            result["applied"].append(name)
                        except Exception as e:
                            result["applied"].append(f"fail:{e}")
                    break
            except Exception:
                pass

        # Profile 3/4 banner — complete payment if link present
        page.goto("https://publisher.rakutenadvertising.com/", wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)
        for label in ("Publisher profile", "complete your Publisher profile", "ACCOUNT", "Payment"):
            loc = page.get_by_text(label, exact=False)
            if loc.count():
                try:
                    loc.first.click(timeout=2500)
                    time.sleep(3)
                    result["steps"].append(f"profile:{label}")
                    dump(page, "profile-" + re.sub(r"[^a-z0-9]+", "-", label.lower())[:24])
                except Exception:
                    pass

        result["final_url"] = page.url
        result["final_snip"] = page.locator("body").inner_text()[:2500]
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("RESULT", json.dumps({k: result.get(k) for k in ("steps", "applied", "marketplace_url", "hrefs", "final_url")}, indent=2)[:3000])
        time.sleep(2)
        ctx.close()


if __name__ == "__main__":
    main()

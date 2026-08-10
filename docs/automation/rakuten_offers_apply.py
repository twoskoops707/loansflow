"""
Rakuten: login, set US/CA payment country if needed, open advertisers, apply finance offers.
ONE Chrome profile only (.chrome-rakuten-alt). No Google/AdSense.
"""
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
TAG = "rakuten-offers-2026-08-09"
OUT = ROOT / f"{TAG}-RESULT.json"
PASSWORD = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"
SITE = "https://loansflow.loan/"


def shot(page, name: str) -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"{TAG}-{name}.png"), full_page=True)


def dump(page, name: str) -> str:
    body = page.locator("body").inner_text(timeout=15000)[:25000]
    (ROOT / f"{TAG}-{name}.txt").write_text(f"{page.url}\n\n{body}", encoding="utf-8")
    shot(page, name)
    print(name, page.url)
    print(body[:900].replace("\n", " | "))
    return body


def click_first(page, labels) -> bool:
    for label in labels:
        btn = page.get_by_role("button", name=re.compile(label, re.I))
        if btn.count() and btn.first.is_visible():
            btn.first.click()
            time.sleep(2)
            print("click btn", label)
            return True
        txt = page.get_by_text(re.compile(f"^{label}$", re.I))
        if txt.count() and txt.first.is_visible():
            try:
                txt.first.click(timeout=2000)
                time.sleep(2)
                print("click txt", label)
                return True
            except Exception:
                pass
    return False


def main() -> None:
    PROFILE.mkdir(parents=True, exist_ok=True)
    result: dict = {"at": datetime.now(timezone.utc).isoformat(), "steps": [], "applied": []}
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE),
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1360, "height": 900},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto("https://publisher.rakutenadvertising.com/", wait_until="domcontentloaded", timeout=120000)
        time.sleep(5)
        dump(page, "01-home")

        user = page.locator("input#username, input[name='username'], input[type='email']")
        pw = page.locator("input[type='password']")
        if user.count() and pw.count() and user.first.is_visible():
            user.first.fill(EMAIL)
            pw.first.fill(PASSWORD)
            click_first(page, [r"^Log in$", r"^Login$", r"^Sign in$", r"^Next$"])
            page.keyboard.press("Enter")
            time.sleep(10)
            result["steps"].append("login")
        dump(page, "02-after-login")

        # Payment country/state if stuck
        body = page.locator("body").inner_text()
        if re.search(r"where are you registered|Select Country|Choose State", body, re.I):
            # Country United States
            for sel in ("text=United States", "text=United States of America"):
                try:
                    if page.get_by_text("United States", exact=True).count():
                        page.get_by_text("United States", exact=True).first.click()
                        time.sleep(1)
                        result["steps"].append("country_us")
                        break
                except Exception:
                    pass
            # Open country combobox
            combo = page.locator("[role='combobox'], select").first
            if combo.count() or page.locator("text=Select Country").count():
                try:
                    page.get_by_text("Select Country", exact=False).first.click()
                    time.sleep(1)
                    page.get_by_text("United States", exact=True).first.click()
                    result["steps"].append("country_us_combo")
                    time.sleep(1)
                except Exception as e:
                    result["steps"].append(f"country_err:{e}")
            # State California
            try:
                page.get_by_text("Choose State", exact=False).first.click()
                time.sleep(1)
                page.get_by_text("California", exact=True).first.click()
                result["steps"].append("state_ca")
                time.sleep(1)
            except Exception as e:
                result["steps"].append(f"state_err:{e}")
            click_first(page, [r"^Next$", r"^Continue$", r"^Save$"])
            time.sleep(4)
            dump(page, "03-after-geo")

        # Ensure site URL if field present
        for sel in ("input[type='url']", "input[name*='url' i]", "input[placeholder*='http' i]"):
            loc = page.locator(sel)
            if loc.count() and loc.first.is_visible():
                loc.first.fill(SITE)
                result["steps"].append("filled_site")
                click_first(page, [r"^Next$", r"^Continue$", r"^Save$", r"^Add$"])
                time.sleep(3)

        # Advertisers
        for url in (
            "https://publisher.rakutenadvertising.com/advertisers",
            "https://publisher.rakutenadvertising.com/advertiser-directory",
            "https://publisher.rakutenadvertising.com/discover",
        ):
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                time.sleep(5)
                b = dump(page, "adv-" + url.rstrip("/").split("/")[-1])
                result["steps"].append(f"open:{url}")
                if "advertiser" in b.lower() or "join" in b.lower() or "apply" in b.lower():
                    break
            except Exception as e:
                result["steps"].append(f"adv_err:{e}")

        # Search finance keywords
        search = page.locator("input[type='search'], input[placeholder*='Search' i], input[aria-label*='Search' i]")
        if search.count() and search.first.is_visible():
            for q in ("mortgage", "loan", "finance", "credit"):
                search.first.fill(q)
                search.first.press("Enter")
                time.sleep(4)
                dump(page, f"search-{q}")
                # Click Join / Apply on first few cards
                for label in (r"Join", r"Apply", r"Request", r"Get links"):
                    btns = page.get_by_role("button", name=re.compile(label, re.I))
                    n = min(btns.count(), 3)
                    for i in range(n):
                        try:
                            btns.nth(i).click(timeout=3000)
                            time.sleep(2)
                            click_first(page, [r"^Submit$", r"^Confirm$", r"^Apply$", r"^Send$", r"^OK$"])
                            result["applied"].append(f"{q}:{label}:{i}")
                            time.sleep(1)
                        except Exception:
                            pass
                break  # one search is enough for this pass

        # Also try text Join links
        joins = page.get_by_role("link", name=re.compile(r"Join|Apply", re.I))
        for i in range(min(joins.count(), 5)):
            try:
                joins.nth(i).click(timeout=3000)
                time.sleep(2)
                click_first(page, [r"^Submit$", r"^Confirm$", r"^Apply$", r"^Send$"])
                result["applied"].append(f"link_join:{i}")
            except Exception:
                pass

        result["final_url"] = page.url
        result["final_snip"] = page.locator("body").inner_text()[:3000]
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("RESULT", json.dumps({k: result[k] for k in ("steps", "applied", "final_url")}, indent=2))
        time.sleep(3)
        ctx.close()


if __name__ == "__main__":
    main()

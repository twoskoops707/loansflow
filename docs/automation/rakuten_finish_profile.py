"""Finish Rakuten publisher profile (payment country/state) — unlocks offers."""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROF = ROOT / ".chrome-rakuten-alt"
PASS = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"
TAG = "rakuten-profile"
OUT = ROOT / f"{TAG}-RESULT.json"
SHOTS = ROOT / "outreach-shots"


def dump(page, name: str) -> str:
    body = page.locator("body").inner_text(timeout=20000)[:30000]
    (ROOT / f"{TAG}-{name}.txt").write_text(f"{page.url}\n\n{body}", encoding="utf-8")
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"{TAG}-{name}.png"), full_page=True)
    print(name, page.url)
    print(body[:1200].replace("\n", " | "))
    return body


def main() -> None:
    result = {"at": datetime.now(timezone.utc).isoformat(), "steps": []}
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROF),
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1400, "height": 950},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto("https://publisher.rakutenadvertising.com/", wait_until="domcontentloaded", timeout=120000)
        time.sleep(6)
        if page.locator("input[type='password']").count() and page.locator("input[type='password']").first.is_visible():
            page.locator("input#username, input[name='username'], input[type='email']").first.fill(EMAIL)
            page.locator("input[type='password']").first.fill(PASS)
            page.get_by_role("button", name=re.compile(r"Log ?in", re.I)).first.click()
            time.sleep(10)

        dump(page, "01-home")
        # Click profile completion banner / account
        for label in (
            "completing your Publisher profile",
            "Publisher profile",
            "View profile",
            "ACCOUNT",
        ):
            loc = page.get_by_text(label, exact=False)
            if loc.count() and loc.first.is_visible():
                try:
                    loc.first.click()
                    time.sleep(4)
                    result["steps"].append(f"click:{label}")
                    break
                except Exception:
                    pass

        for url in (
            "https://publisher.rakutenadvertising.com/account/profile",
            "https://publisher.rakutenadvertising.com/account",
            "https://publisher.rakutenadvertising.com/organization",
            "https://publisher.rakutenadvertising.com/onboarding/start",
        ):
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            time.sleep(5)
            body = dump(page, "page-" + url.rstrip("/").split("/")[-1])
            result["steps"].append(f"open:{url}")

            # Country / state payment setup
            if re.search(r"country|state|payment|tax|paypal|wire|address", body, re.I):
                # Try select United States
                for txt in ("Select Country", "Country"):
                    if page.get_by_text(txt, exact=False).count():
                        try:
                            page.get_by_text(txt, exact=False).first.click()
                            time.sleep(1)
                            page.get_by_text("United States", exact=True).first.click()
                            result["steps"].append("country_us")
                            time.sleep(1)
                        except Exception as e:
                            result["steps"].append(f"country_err:{e}")
                for txt in ("Choose State", "State"):
                    if page.get_by_text(txt, exact=False).count():
                        try:
                            page.get_by_text(txt, exact=False).first.click()
                            time.sleep(1)
                            page.get_by_text("California", exact=True).first.click()
                            result["steps"].append("state_ca")
                            time.sleep(1)
                        except Exception as e:
                            result["steps"].append(f"state_err:{e}")
                # Fill common address fields if empty
                fills = {
                    "input[name*='address' i]": "1 Market St",
                    "input[name*='city' i]": "San Francisco",
                    "input[name*='zip' i]": "94105",
                    "input[name*='postal' i]": "94105",
                    "input[name*='phone' i]": "4155550100",
                }
                for sel, val in fills.items():
                    loc = page.locator(sel)
                    if loc.count() and loc.first.is_visible():
                        try:
                            cur = loc.first.input_value()
                            if not cur:
                                loc.first.fill(val)
                                result["steps"].append(f"fill:{sel}")
                        except Exception:
                            pass
                for btn in (r"^Next$", r"^Continue$", r"^Save$", r"^Submit$", r"^Update$"):
                    b = page.get_by_role("button", name=re.compile(btn, re.I))
                    if b.count() and b.first.is_visible():
                        try:
                            b.first.click()
                            time.sleep(3)
                            result["steps"].append(f"btn:{btn}")
                        except Exception:
                            pass
                dump(page, "after-geo-" + url.rstrip("/").split("/")[-1])

        # Re-check offers with empty query / popular
        page.goto("https://publisher.rakutenadvertising.com/offers", wait_until="domcontentloaded", timeout=60000)
        time.sleep(6)
        dump(page, "offers-again")
        search = page.locator("input[type='search'], input[placeholder*='Search' i]")
        if search.count():
            for q in ("bank", "credit", "travel", "retail", ""):
                if q:
                    search.first.fill(q)
                    search.first.press("Enter")
                time.sleep(5)
                body = dump(page, f"offers-q-{q or 'blank'}")
                if "couldn't find any results" not in body.lower() and "Join" in body:
                    result["offers_found"] = q or "blank"
                    # click joins
                    joins = page.get_by_role("button", name=re.compile(r"Join|Apply", re.I))
                    for i in range(min(joins.count(), 5)):
                        try:
                            joins.nth(i).click()
                            time.sleep(2)
                            result.setdefault("applied", []).append(f"{q}:{i}")
                        except Exception:
                            pass
                    break

        result["final_url"] = page.url
        result["final_snip"] = page.locator("body").inner_text()[:2500]
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("RESULT", json.dumps(result, indent=2)[:2500])
        ctx.close()


if __name__ == "__main__":
    main()

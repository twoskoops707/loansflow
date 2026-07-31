"""Finish Rakuten onboarding via existing Chrome CDP :9333 (same profile as Gmail)."""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / "outreach-shots"
OUT = ROOT / "rakuten-cdp-onboard-RESULT.json"
PASSWORD = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"
SITE = "https://loansflow.loan/"
CDP = "http://127.0.0.1:9333"


def shot(page, name: str) -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"rakuten-cdp-{name}.png"), full_page=True)


def body(page) -> str:
    return page.inner_text("body")


def login_if_needed(page) -> None:
    if page.locator("input[type='password']").count() == 0:
        return
    page.locator(
        "input#username, input[name='username'], input[type='email'], input[name='email']"
    ).first.fill(EMAIL)
    page.locator("input[type='password']").first.fill(PASSWORD)
    page.locator("button[type='submit'], button:has-text('Login')").first.click()
    time.sleep(8)


def fill_react_select(page, text: str) -> bool:
    try:
        page.locator("text=Select Country").first.click(timeout=2500)
        time.sleep(0.4)
    except Exception:
        pass
    candidates = page.locator("input[id^='react-select']")
    for i in range(candidates.count()):
        inp = candidates.nth(i)
        try:
            if not inp.is_visible():
                continue
            inp.click(timeout=2000)
            inp.fill("")
            inp.type(text, delay=35)
            time.sleep(1.0)
            opt = page.locator(
                f"div[id*='react-select'][id*='option']:has-text('{text}')"
            ).first
            if opt.count():
                opt.click(timeout=3000)
            else:
                inp.press("Enter")
            time.sleep(0.8)
            return True
        except Exception:
            continue
    return False


def fill_any_url(page) -> bool:
    for sel in (
        "input[type='url']",
        "input[name*='url' i]",
        "input[placeholder*='http' i]",
        "input[placeholder*='website' i]",
        "input[placeholder*='site' i]",
        "input[aria-label*='website' i]",
    ):
        loc = page.locator(sel).first
        try:
            if loc.count() and loc.is_visible():
                loc.fill(SITE)
                return True
        except Exception:
            continue
    return False


def click_next(page) -> str | None:
    for label in (
        "Next",
        "Continue",
        "Get started",
        "Submit",
        "Finish",
        "Done",
        "Save and continue",
    ):
        loc = page.locator(f"button:has-text('{label}')").first
        try:
            if loc.count() and loc.is_visible() and loc.is_enabled():
                loc.click(timeout=4000)
                time.sleep(2.2)
                return label
        except Exception:
            continue
    return None


def pick_choice(page, *keywords: str) -> str | None:
    for kw in keywords:
        loc = page.get_by_text(kw, exact=False).first
        try:
            if loc.count() and loc.is_visible():
                loc.click(timeout=2500)
                time.sleep(0.6)
                return kw
        except Exception:
            continue
    return None


def main() -> None:
    result: dict = {
        "time": datetime.now(timezone.utc).isoformat(),
        "steps": [],
        "site_filled": False,
    }
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP)
        context = browser.contexts[0]
        page = context.new_page()
        page.goto(
            "https://publisher.rakutenadvertising.com/onboarding/start",
            wait_until="domcontentloaded",
            timeout=120000,
        )
        time.sleep(4)
        login_if_needed(page)
        if "get started" in body(page).lower():
            page.locator("button:has-text('Get started'), a:has-text('Get started')").first.click()
            time.sleep(3)
        shot(page, "00-start")

        for i in range(18):
            b = body(page)
            bl = b.lower()
            result["steps"].append({"i": i, "url": page.url, "body": b[:900]})
            shot(page, f"{i:02d}")

            if "verify your email" in bl:
                result["verified"] = False
                result["status"] = "needs_email_verify"
                break
            result["verified"] = True

            if "select country" in bl or "where are you registered" in bl:
                ok = fill_react_select(page, "United States")
                if not ok:
                    ok = fill_react_select(page, "United States of America")
                result["steps"].append({"country": ok})
            if "currency" in bl:
                fill_react_select(page, "USD")
            if re.search(r"how do you|publisher type|platform type|promote", bl):
                pick_choice(page, "Website", "Content", "Publisher", "Blog")
            if re.search(r"vertical|category|industry|niche", bl):
                pick_choice(page, "Finance", "Financial", "Business", "Other")
            if fill_any_url(page):
                result["site_filled"] = True
            if re.search(r"agree|terms|privacy", bl):
                page.evaluate(
                    """() => {
                      for (const el of document.querySelectorAll('input[type=checkbox]')) {
                        if (!el.checked && el.offsetParent) el.click();
                      }
                    }"""
                )

            clicked = click_next(page)
            result["steps"].append({"next": clicked, "url": page.url})
            if "/onboarding/" not in page.url:
                break
            if not clicked:
                result["steps"].append({"stuck": body(page)[:1500]})
                break

        final = body(page)
        result["final_url"] = page.url
        result["final_body"] = final[:3500]
        result["site_attached"] = bool(
            result.get("site_filled") or re.search(r"loansflow\.loan", final, re.I)
        )
        result["status"] = (
            "site_attached" if result["site_attached"] else "verified_partial_onboarding"
        )
        if not result["site_attached"]:
            result["remaining_click"] = (
                f"On {result.get('final_url')}: finish onboarding and attach {SITE}"
            )
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(
            json.dumps(
                {
                    "status": result["status"],
                    "verified": result.get("verified"),
                    "site_attached": result.get("site_attached"),
                    "site_filled": result.get("site_filled"),
                    "url": result.get("final_url"),
                    "body": (result.get("final_body") or "")[:800],
                    "remaining_click": result.get("remaining_click"),
                },
                indent=2,
            )
        )
        page.close()


if __name__ == "__main__":
    main()

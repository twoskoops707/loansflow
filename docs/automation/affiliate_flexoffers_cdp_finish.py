"""FlexOffers OTP finish via Chrome CDP :9333."""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / "outreach-shots"
OUT = ROOT / "flexoffers-cdp-finish-RESULT.json"
EMAIL = "loansflow707@gmail.com"
PASSWORD = "LoansFlow!Partner2026"
SITE = "https://loansflow.loan/"
CDP = "http://127.0.0.1:9333"


def shot(page, name: str) -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"fo-cdp-{name}.png"), full_page=True)


def latest_code(mail) -> str | None:
    mail.goto(
        "https://mail.google.com/mail/u/0/#search/flexoffers+passcode+OR+flexoffers+verification",
        wait_until="domcontentloaded",
        timeout=90000,
    )
    time.sleep(5)
    mail.evaluate(
        """() => {
        const rows=[...document.querySelectorAll('tr.zA')].filter(r=>r.offsetParent!==null);
        if(rows[0]) rows[0].click();
    }"""
    )
    time.sleep(3)
    text = mail.inner_text("div[role='main']")
    codes = re.findall(r"\b(\d{6})\b", text)
    return codes[0] if codes else None


def main() -> None:
    result: dict = {"time": datetime.now(timezone.utc).isoformat(), "steps": []}
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP)
        ctx = browser.contexts[0]
        page = ctx.new_page()
        mail = ctx.new_page()

        page.goto(
            "https://publisherprobeta.flexoffers.com/login",
            wait_until="domcontentloaded",
            timeout=90000,
        )
        time.sleep(3)
        try:
            page.locator("input[type='email'], input[type='text']").first.fill(EMAIL)
            page.locator("input[type='password']").first.fill(PASSWORD)
            page.locator("button[type='submit']").first.click()
        except Exception as e:
            result["login_error"] = str(e)
        time.sleep(6)
        shot(page, "01-after-login")
        body = page.inner_text("body")
        result["steps"].append({"url": page.url, "body": body[:1200]})

        # Turnstile / captcha detection
        if page.locator("iframe[src*='turnstile'], iframe[src*='challenges.cloudflare']").count():
            result["status"] = "blocked_turnstile"
            result["remaining_click"] = (
                "Open https://publisherprobeta.flexoffers.com/login as loansflow707@gmail.com, "
                "solve Turnstile, request new email OTP, paste code, then add https://loansflow.loan/"
            )
            OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
            print(json.dumps(result, indent=2)[:2000])
            page.close()
            mail.close()
            return

        if "verify" in body.lower() or "passcode" in body.lower() or "otp" in body.lower():
            code = None
            for i in range(8):
                code = latest_code(mail)
                result["steps"].append({"code_try": i, "code": code})
                if code:
                    break
                time.sleep(4)
            if not code:
                result["status"] = "blocked_no_otp"
                result["remaining_click"] = (
                    "Request a fresh FlexOffers email passcode in headed browser + Turnstile, "
                    "then enter code for loansflow707@gmail.com"
                )
                OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
                print(json.dumps(result, indent=2)[:2000])
                page.close()
                mail.close()
                return
            # fill code
            for sel in ("input[type='text']", "input[name*='code' i]", "input[placeholder*='code' i]"):
                loc = page.locator(sel).first
                try:
                    if loc.count() and loc.is_visible():
                        loc.fill(code)
                        break
                except Exception:
                    pass
            page.locator("button[type='submit'], button:has-text('Verify'), button:has-text('Continue')").first.click()
            time.sleep(5)
            shot(page, "02-after-otp")

        # Try add site
        b2 = page.inner_text("body")
        result["steps"].append({"after": page.url, "body": b2[:1200]})
        for sel in ("input[type='url']", "input[placeholder*='http' i]", "input[name*='url' i]"):
            loc = page.locator(sel).first
            try:
                if loc.count() and loc.is_visible():
                    loc.fill(SITE)
                    result["site_filled"] = True
            except Exception:
                pass
        result["status"] = (
            "ok" if ("dashboard" in page.url.lower() or result.get("site_filled")) else "partial"
        )
        if result["status"] != "ok":
            result["remaining_click"] = (
                "Finish FlexOffers in headed browser: OTP + Turnstile + add https://loansflow.loan/. "
                "Mark ticket 47332464239 Not Spam if still in Spam."
            )
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps({k: result[k] for k in result if k != "steps"}, indent=2))
        print("steps", len(result["steps"]))
        page.close()
        mail.close()


if __name__ == "__main__":
    main()

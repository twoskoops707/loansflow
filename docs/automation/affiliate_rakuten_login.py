"""Login to Rakuten after email activation link; capture post-login onboarding."""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROFILE = ROOT / ".chrome-gmail-outreach2"
SHOTS = ROOT / "outreach-shots"
OUT = ROOT / "rakuten-login-RESULT.json"
PASSWORD = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"
SITE = "https://loansflow.loan/"


def shot(page, name: str) -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"rakuten-{name}.png"), full_page=True)


def main() -> None:
    result = {"time": datetime.now(timezone.utc).isoformat(), "steps": []}
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE),
            channel="chrome",
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1280, "height": 900},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(
            "https://publisher.rakutenadvertising.com/",
            wait_until="domcontentloaded",
            timeout=120000,
        )
        time.sleep(4)
        shot(page, "30-start")

        # Fill login if present
        if page.locator("input[type='password']").count():
            email_sel = "input#username, input[name='username'], input[type='email'], input[name='email']"
            page.locator(email_sel).first.fill(EMAIL)
            page.locator("input[type='password']").first.fill(PASSWORD)
            shot(page, "31-login-filled")
            # Detect hard captcha wall
            captcha = page.locator(
                "iframe[src*='recaptcha'], iframe[title*='reCAPTCHA'], .g-recaptcha"
            ).count()
            if captcha == 0:
                try:
                    captcha = page.get_by_text("I'm not a robot").count()
                except Exception:
                    captcha = 0
            if captcha:
                result["status"] = "blocked_captcha_on_login"
                result["captcha"] = captcha
                shot(page, "31-captcha-wall")
                OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
                print(json.dumps(result, indent=2)[:1500])
                ctx.close()
                return
            page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Log in')").first.click()
            time.sleep(8)
            shot(page, "32-after-login")

        for i in range(10):
            time.sleep(3)
            txt = page.inner_text("body")
            url = page.url
            result["steps"].append({"i": i, "url": url, "body": txt[:1500]})
            if "verify your email" in txt.lower():
                result["email_verified"] = False
                break
            if any(
                k in txt.lower()
                for k in ("get started", "onboarding", "add website", "create media", "publisher id", "welcome")
            ):
                result["email_verified"] = True
                break
            if len(txt) > 60 and "publisher dashboard" in (page.title() or "").lower():
                # still loading?
                if "verify" not in txt.lower():
                    result["email_verified"] = "likely"
                    break
            for sel in (
                "button:has-text('Get Started')",
                "button:has-text('Continue')",
                "button:has-text('Next')",
                "button:has-text('Accept')",
            ):
                loc = page.locator(sel).first
                try:
                    if loc.count() and loc.is_visible():
                        loc.click(timeout=2000)
                        time.sleep(2)
                except Exception:
                    pass

        # Try add site
        for sel in (
            "input[name*='website' i]",
            "input[id*='website' i]",
            "input[type='url']",
            "input[placeholder*='website' i]",
            "input[placeholder*='http' i]",
            "input[name*='url' i]",
        ):
            loc = page.locator(sel).first
            try:
                if loc.count() and loc.is_visible():
                    loc.fill(SITE)
                    result["site_filled"] = True
                    break
            except Exception:
                continue
        shot(page, "33-final")
        result["final_url"] = page.url
        result["final_title"] = page.title()
        result["final_body"] = page.inner_text("body")[:4000]
        if "verify your email" in result["final_body"].lower():
            result["status"] = "account_created_email_unverified"
        elif "captcha" in result["final_body"].lower() and page.locator("iframe[src*='recaptcha']").count():
            result["status"] = "blocked_captcha"
        else:
            result["status"] = "logged_in"
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(
            json.dumps(
                {
                    "status": result["status"],
                    "email_verified": result.get("email_verified"),
                    "final_url": result["final_url"],
                    "body_snip": result["final_body"][:600],
                },
                indent=2,
            )
        )
        ctx.close()


if __name__ == "__main__":
    main()

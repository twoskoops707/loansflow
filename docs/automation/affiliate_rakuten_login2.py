"""Attempt Rakuten login ignoring reCAPTCHA badge (not a wall)."""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROFILE = ROOT / ".chrome-gmail-outreach2"
SHOTS = ROOT / "outreach-shots"
OUT = ROOT / "rakuten-login2-RESULT.json"
PASSWORD = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"


def main() -> None:
    result = {"time": datetime.now(timezone.utc).isoformat()}
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
        iframes = page.evaluate(
            """() => [...document.querySelectorAll('iframe')].map(f => ({
              src: (f.src||'').slice(0,160), title: f.title||'', w: f.offsetWidth, h: f.offsetHeight
            }))"""
        )
        result["iframes"] = iframes
        if page.locator("input[type='password']").count():
            page.locator(
                "input#username, input[name='username'], input[type='email'], input[name='email']"
            ).first.fill(EMAIL)
            page.locator("input[type='password']").first.fill(PASSWORD)
            page.screenshot(path=str(SHOTS / "rakuten-40-before-login.png"), full_page=True)
            page.locator("button[type='submit'], button:has-text('Login')").first.click()
            time.sleep(10)
        page.screenshot(path=str(SHOTS / "rakuten-41-after-login.png"), full_page=True)
        body = page.inner_text("body")
        result.update(
            {
                "url": page.url,
                "title": page.title(),
                "body": body[:4000],
                "status": (
                    "verify_email"
                    if "verify your email" in body.lower()
                    else "logged_in"
                    if "login" not in body.lower()[:80]
                    else "still_login"
                ),
            }
        )
        # wait a bit more if spinner
        for _ in range(8):
            time.sleep(3)
            body = page.inner_text("body")
            if len(body) > 80:
                break
        page.screenshot(path=str(SHOTS / "rakuten-42-settled.png"), full_page=True)
        result["final_url"] = page.url
        result["final_title"] = page.title()
        result["final_body"] = page.inner_text("body")[:4000]
        if "verify your email" in result["final_body"].lower():
            result["status"] = "account_ok_awaiting_email_verify_or_reverify"
        elif "I'm not a robot" in result["final_body"] or page.locator("iframe[title='reCAPTCHA']").count():
            # challenge iframe is larger; badge is tiny
            big = [
                f
                for f in page.evaluate(
                    """() => [...document.querySelectorAll('iframe')].map(f => ({
                      src:(f.src||''), w:f.offsetWidth, h:f.offsetHeight, title:f.title||''
                    }))"""
                )
                if f.get("w", 0) > 100 or f.get("h", 0) > 70
            ]
            if big:
                result["status"] = "blocked_captcha_challenge"
                result["big_iframes"] = big
            else:
                result["status"] = "logged_in_or_onboarding"
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(
            json.dumps(
                {
                    "status": result["status"],
                    "url": result.get("final_url"),
                    "title": result.get("final_title"),
                    "body": result.get("final_body", "")[:700],
                    "iframes": result.get("iframes"),
                },
                indent=2,
            )
        )
        ctx.close()


if __name__ == "__main__":
    main()

"""Resend Rakuten verification, open newest Activate Login link, confirm status."""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROFILE = ROOT / ".chrome-gmail-outreach2"
SHOTS = ROOT / "outreach-shots"
OUT = ROOT / "rakuten-verify2-RESULT.json"
PASSWORD = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "Loans.flow.loan@gmail.com"


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
        dash = ctx.pages[0] if ctx.pages else ctx.new_page()
        dash.goto(
            "https://publisher.rakutenadvertising.com/onboarding/verify-email",
            wait_until="domcontentloaded",
            timeout=120000,
        )
        time.sleep(4)
        # Ensure logged in
        if dash.locator("input[type='password']").count():
            dash.locator(
                "input#username, input[name='username'], input[type='email'], input[name='email']"
            ).first.fill(EMAIL)
            dash.locator("input[type='password']").first.fill(PASSWORD)
            dash.locator("button[type='submit'], button:has-text('Login')").first.click()
            time.sleep(8)
        shot(dash, "50-verify-page")
        before = time.time()
        try:
            dash.locator("text=Resend verification").first.click(timeout=5000)
            time.sleep(3)
            result["steps"].append({"resend": True, "body": dash.inner_text("body")[:500]})
        except Exception as e:
            result["steps"].append({"resend": False, "error": str(e)})
        shot(dash, "51-after-resend")

        mail = ctx.new_page()
        # wait for new mail
        link = None
        for attempt in range(8):
            mail.goto(
                "https://mail.google.com/mail/u/0/#search/from%3Anoreply%40rakutenadvertising.com+Activate",
                wait_until="domcontentloaded",
                timeout=90000,
            )
            time.sleep(4)
            mail.evaluate(
                """() => {
                const rows = [...document.querySelectorAll('tr.zA')].filter(r => r.offsetParent !== null);
                if (rows[0]) rows[0].click();
            }"""
            )
            time.sleep(3)
            hrefs = mail.evaluate(
                """() => [...document.querySelectorAll('div[role=\"main\"] a[href]')]
                    .map(a => a.href)
                    .filter(h => /action-token|verify|Activate/i.test(h))"""
            )
            result["steps"].append({"attempt": attempt, "hrefs": hrefs[:5]})
            if hrefs:
                link = hrefs[0]
                break
            time.sleep(5)
        shot(mail, "52-gmail")

        if not link:
            result["status"] = "no_activation_link"
            OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
            print(json.dumps(result, indent=2)[:2000])
            ctx.close()
            return

        # Open activation in fresh page and wait
        act = ctx.new_page()
        act.goto(link, wait_until="networkidle", timeout=120000)
        time.sleep(5)
        shot(act, "53-activation")
        result["steps"].append(
            {
                "activation_url": act.url,
                "title": act.title(),
                "body": act.inner_text("body")[:2000],
            }
        )

        # If login shown after activation, login then check onboarding
        if act.locator("input[type='password']").count():
            act.locator(
                "input#username, input[name='username'], input[type='email'], input[name='email']"
            ).first.fill(EMAIL)
            act.locator("input[type='password']").first.fill(PASSWORD)
            act.locator("button[type='submit'], button:has-text('Login')").first.click()
            time.sleep(10)
            shot(act, "54-post-activation-login")

        for _ in range(8):
            time.sleep(3)
            body = act.inner_text("body")
            if "verify your email" not in body.lower() and len(body) > 40:
                break
        shot(act, "55-final")
        body = act.inner_text("body")
        result["final_url"] = act.url
        result["final_title"] = act.title()
        result["final_body"] = body[:4000]
        if "verify your email" in body.lower():
            result["status"] = "still_needs_email_verify"
        else:
            result["status"] = "email_verified_or_onboarding"
        result["elapsed_s"] = round(time.time() - before, 1)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(
            json.dumps(
                {
                    "status": result["status"],
                    "url": result["final_url"],
                    "body": result["final_body"][:800],
                },
                indent=2,
            )
        )
        ctx.close()


if __name__ == "__main__":
    main()

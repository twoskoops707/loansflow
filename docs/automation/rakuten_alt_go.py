"""Rakuten publisher login + dashboard probe — no AdSense/Google profile."""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROFILE = ROOT / ".chrome-rakuten-alt"
SHOTS = ROOT / "outreach-shots"
OUT = ROOT / "rakuten-alt-2026-08-09-RESULT.json"
PASSWORD = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"
SITE = "https://loansflow.loan/"
TAG = "rakuten-alt-2026-08-09"


def shot(page, name: str) -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"{TAG}-{name}.png"), full_page=True)


def dump(page, name: str) -> str:
    body = page.locator("body").inner_text(timeout=10000)[:20000]
    (ROOT / f"{TAG}-{name}.txt").write_text(f"{page.url}\n\n{body}", encoding="utf-8")
    shot(page, name)
    print(name, page.url)
    print(body[:1000].replace("\n", " | "))
    return body


def main() -> None:
    PROFILE.mkdir(parents=True, exist_ok=True)
    result: dict = {"at": datetime.now(timezone.utc).isoformat(), "steps": []}
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE),
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1360, "height": 900},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(
            "https://publisher.rakutenadvertising.com/",
            wait_until="domcontentloaded",
            timeout=120000,
        )
        time.sleep(5)
        dump(page, "01-home")

        # Accept cookies if any
        for t in ("Accept", "I agree", "OK"):
            btn = page.get_by_role("button", name=t)
            if btn.count() and btn.first.is_visible():
                btn.first.click()
                time.sleep(1)

        user = page.locator(
            "input#username, input[name='username'], input[type='email'], input[name='email']"
        )
        pw = page.locator("input[type='password']")
        if user.count() and pw.count():
            user.first.fill(EMAIL)
            pw.first.fill(PASSWORD)
            shot(page, "02-filled")
            submit = page.locator(
                "button[type='submit'], button:has-text('Log in'), button:has-text('Login'), button:has-text('Sign in')"
            )
            if submit.count():
                submit.first.click()
            else:
                page.keyboard.press("Enter")
            result["steps"].append("login_submitted")
            time.sleep(10)
        body = dump(page, "03-after-login")

        if "verify your email" in body.lower():
            result["status"] = "need_email_verify"
        elif "robot" in body.lower() and "recaptcha" in body.lower():
            result["status"] = "captcha"
        elif any(x in page.url for x in ("onboarding", "dashboard", "publisher")):
            result["status"] = "in_app"
        else:
            result["status"] = "unknown"

        # Try finish onboarding paths
        for url in (
            "https://publisher.rakutenadvertising.com/onboarding/start",
            "https://publisher.rakutenadvertising.com/onboarding/business-classification",
            "https://publisher.rakutenadvertising.com/onboarding/business-model",
            "https://publisher.rakutenadvertising.com/onboarding/add-channel-url",
            "https://publisher.rakutenadvertising.com/",
        ):
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                time.sleep(4)
                b = dump(page, "nav-" + url.rstrip("/").split("/")[-1])
                # fill website
                for sel in (
                    "input[type='url']",
                    "input[name*='url' i]",
                    "input[placeholder*='http' i]",
                    "input[aria-label*='Website' i]",
                    "input[aria-label*='URL' i]",
                ):
                    loc = page.locator(sel)
                    if loc.count() and loc.first.is_visible():
                        loc.first.fill(SITE)
                        result["steps"].append(f"filled:{sel}")
                for label in (
                    "Website",
                    "Content",
                    "Financial Services",
                    "Finance",
                    "Get started",
                    "Continue",
                    "Next",
                    "Save",
                    "Add",
                ):
                    btn = page.get_by_role("button", name=label)
                    if btn.count() and btn.first.is_visible():
                        btn.first.click()
                        time.sleep(2)
                        result["steps"].append(f"click:{label}")
                    else:
                        txt = page.get_by_text(label, exact=False)
                        if txt.count() and txt.first.is_visible():
                            try:
                                txt.first.click(timeout=2000)
                                result["steps"].append(f"text:{label}")
                                time.sleep(2)
                            except Exception:
                                pass
                if "advertiser" in b.lower() or "offer" in b.lower():
                    result["steps"].append("offers_language_seen")
            except Exception as exc:
                result["steps"].append(f"err:{url}:{exc}")

        # Advertiser marketplace guess
        for url in (
            "https://publisher.rakutenadvertising.com/advertisers",
            "https://publisher.rakutenadvertising.com/marketplace",
            "https://publisher.rakutenadvertising.com/discover",
        ):
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=45000)
                time.sleep(3)
                dump(page, "mkt-" + url.split("/")[-1])
            except Exception:
                pass

        result["final_url"] = page.url
        result["final_body"] = page.locator("body").inner_text()[:4000]
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("DONE", result.get("status"), result["steps"][:20])
        # keep browser open briefly for user
        time.sleep(5)
        ctx.close()


if __name__ == "__main__":
    main()

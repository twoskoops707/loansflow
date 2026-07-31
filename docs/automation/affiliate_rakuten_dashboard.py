"""Follow up Rakuten publisher dashboard after registration — wait for UI + capture evidence."""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROFILE = ROOT / ".chrome-gmail-outreach2"
SHOTS = ROOT / "outreach-shots"
OUT = ROOT / "rakuten-dashboard-RESULT.json"
PASSWORD = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"
SITE = "https://loansflow.loan/"
DASH = "https://publisher.rakutenadvertising.com/"
LOGIN = "https://publisher.rakutenadvertising.com/login"


def shot(page, name: str) -> str:
    SHOTS.mkdir(parents=True, exist_ok=True)
    path = SHOTS / f"rakuten-{name}.png"
    page.screenshot(path=str(path), full_page=True)
    return str(path)


def body(page) -> str:
    try:
        return page.inner_text("body")
    except Exception:
        return ""


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
        page.goto(DASH, wait_until="domcontentloaded", timeout=120000)
        time.sleep(8)
        shot(page, "10-dash-load")
        txt = body(page)
        result["steps"].append({"url": page.url, "title": page.title(), "body": txt[:2500]})

        # If login form, sign in
        if page.locator("input#username, input[name='username'], input[type='email']").count() and (
            "login" in page.url.lower() or "sign in" in txt.lower() or "password" in txt.lower()
        ):
            try:
                if page.locator("input#username").count():
                    page.fill("input#username", EMAIL)
                elif page.locator("input[type='email']").count():
                    page.fill("input[type='email']", EMAIL)
                page.fill("input[type='password']", PASSWORD)
                page.locator("button[type='submit'], button:has-text('Log'), button:has-text('Sign')").first.click()
                time.sleep(8)
                shot(page, "11-after-login")
                txt = body(page)
                result["steps"].append({"step": "login", "url": page.url, "body": txt[:2500]})
            except Exception as e:
                result["steps"].append({"step": "login_error", "error": str(e)})

        # Wait for dashboard content beyond spinner
        for i in range(12):
            time.sleep(3)
            txt = body(page)
            if len(txt) > 40 and "loading" not in txt.lower():
                break
            # click through cookie / get started if present
            for sel in (
                "button:has-text('Get Started')",
                "button:has-text('Continue')",
                "button:has-text('Accept')",
                "button:has-text('Next')",
                "a:has-text('Get Started')",
                "button:has-text('Add')",
                "button:has-text('Create')",
            ):
                loc = page.locator(sel).first
                try:
                    if loc.count() and loc.is_visible():
                        loc.click(timeout=2000)
                        time.sleep(2)
                except Exception:
                    pass
        shot(page, "12-dash-settled")
        txt = body(page)
        result["steps"].append({"step": "settled", "url": page.url, "title": page.title(), "body": txt[:4000]})

        # Try to fill website if onboarding fields present
        filled_site = False
        for sel in (
            "input[name*='website' i]",
            "input[id*='website' i]",
            "input[placeholder*='website' i]",
            "input[type='url']",
            "input[placeholder*='http' i]",
        ):
            loc = page.locator(sel).first
            try:
                if loc.count() and loc.is_visible():
                    loc.fill(SITE)
                    filled_site = True
                    break
            except Exception:
                continue
        if filled_site:
            for sel in (
                "button[type='submit']",
                "button:has-text('Continue')",
                "button:has-text('Save')",
                "button:has-text('Submit')",
                "button:has-text('Next')",
            ):
                loc = page.locator(sel).first
                try:
                    if loc.count() and loc.is_visible():
                        loc.click()
                        break
                except Exception:
                    continue
            time.sleep(4)
            shot(page, "13-site-filled")
            result["steps"].append({"step": "site_filled", "url": page.url, "body": body(page)[:2000]})

        result["final_url"] = page.url
        result["final_title"] = page.title()
        result["final_body"] = body(page)[:4000]
        result["status"] = "ok" if "Publisher Dashboard" in (page.title() or "") or "rakuten" in page.url else "unknown"
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps({k: result[k] for k in ("status", "final_url", "final_title")}, indent=2))
        print("BODY_SNIP", result["final_body"][:800])
        ctx.close()


if __name__ == "__main__":
    main()

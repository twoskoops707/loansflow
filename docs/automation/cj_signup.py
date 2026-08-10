"""Sign up CJ publisher (loansflow707) — secrets from disk only."""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
EMAIL = "loansflow707@gmail.com"
PASS = (ROOT / ".secret-cj-password.txt").read_text(encoding="utf-8").strip()
OUT = ROOT / "cj-signup-2026-08-09-RESULT.json"
SHOTS = ROOT / "outreach-shots"
TAG = "cj-signup"


def main() -> None:
    result = {"at": datetime.now(timezone.utc).isoformat(), "steps": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto("https://public.cj.com/signup/publisher", wait_until="domcontentloaded", timeout=120000)
        time.sleep(4)
        SHOTS.mkdir(parents=True, exist_ok=True)
        try:
            page.screenshot(path=str(SHOTS / f"{TAG}-01.png"), full_page=True)
        except Exception as e:
            result["steps"].append(f"shot1_err:{e}")

        # Country United States if combobox
        try:
            country = page.get_by_role("combobox", name="Country")
            if country.count():
                country.first.click()
                time.sleep(1)
                page.get_by_text("United States", exact=True).first.click()
                result["steps"].append("country_us")
                time.sleep(1)
        except Exception as e:
            result["steps"].append(f"country_err:{e}")

        page.locator('input[name="email"], input[type="email"]').first.fill(EMAIL)
        page.locator('input[name="password"]').first.fill(PASS)
        page.locator('input[name="confirmPassword"]').first.fill(PASS)
        try:
            page.screenshot(path=str(SHOTS / f"{TAG}-02-filled.png"), full_page=True)
        except Exception:
            pass
        page.get_by_role("button", name="Submit").click()
        result["steps"].append("submitted")
        time.sleep(12)
        body = page.locator("body").inner_text()
        try:
            page.screenshot(path=str(SHOTS / f"{TAG}-03-after.png"), full_page=True)
        except Exception:
            pass
        (ROOT / f"{TAG}-03.txt").write_text(f"{page.url}\n\n{body[:12000]}", encoding="utf-8")
        result["final_url"] = page.url
        result["snip"] = body[:2500]
        low = body.lower()
        result["ok"] = any(
            x in low
            for x in ("verify", "check your email", "confirmation", "welcome", "company", "website", "thank", "almost")
        )
        result["needs_email"] = "verify" in low or "check your email" in low or "confirmation" in low
        print("URL", page.url)
        print(body[:900].replace("\n", " | "))
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("RESULT", json.dumps({k: result[k] for k in ("steps", "ok", "needs_email", "final_url")}, indent=2))
        time.sleep(1)
        browser.close()


if __name__ == "__main__":
    main()

"""One-shot Gmail re-auth for loansflow707 — password only, one profile."""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROFILE = ROOT / ".chrome-gmail-outreach2"
PASS = (ROOT / ".secret-gmail-password.txt").read_text(encoding="utf-8").strip()
OUT = ROOT / "gmail-reauth-2026-08-09-RESULT.json"
SHOTS = ROOT / "outreach-shots"


def main() -> None:
    result = {"at": datetime.now(timezone.utc).isoformat(), "steps": []}
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE),
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1280, "height": 900},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto("https://mail.google.com/mail/u/0/#inbox", wait_until="domcontentloaded", timeout=120000)
        time.sleep(5)
        body = page.locator("body").inner_text()
        SHOTS.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(SHOTS / "gmail-reauth-01.png"), full_page=True)
        (ROOT / "gmail-reauth-01.txt").write_text(f"{page.url}\n\n{body[:8000]}", encoding="utf-8")
        print("01", page.url, body[:400].replace("\n", " | "))

        if "Verify it" in body or "sign in" in body.lower() or "accounts.google" in page.url:
            # account chooser
            acct = page.get_by_text("loansflow707@gmail.com")
            if acct.count():
                acct.first.click()
                time.sleep(3)
                result["steps"].append("chose_account")
            next_btn = page.get_by_role("button", name="Next")
            if next_btn.count() and next_btn.first.is_visible():
                next_btn.first.click()
                time.sleep(3)
                result["steps"].append("next")
            taw = page.get_by_text("Try another way")
            if taw.count() and taw.first.is_visible():
                taw.first.click()
                time.sleep(2)
                result["steps"].append("try_another")
                pw_opt = page.get_by_text("Enter your password")
                if pw_opt.count():
                    pw_opt.first.click()
                    time.sleep(2)
            pw = page.locator("input[type='password'], input[name='Passwd']")
            if pw.count() and pw.first.is_visible():
                pw.first.fill(PASS)
                page.get_by_role("button", name="Next").first.click()
                time.sleep(10)
                result["steps"].append("password_submitted")

        page.goto("https://mail.google.com/mail/u/0/#inbox", wait_until="domcontentloaded", timeout=120000)
        time.sleep(6)
        body = page.locator("body").inner_text()
        page.screenshot(path=str(SHOTS / "gmail-reauth-02.png"), full_page=True)
        (ROOT / "gmail-reauth-02.txt").write_text(f"{page.url}\n\n{body[:12000]}", encoding="utf-8")
        print("02", page.url, body[:600].replace("\n", " | "))
        result["ok"] = "inbox" in body.lower() and "verify it" not in body.lower()
        result["final_url"] = page.url
        # quick partner search if in
        if result["ok"]:
            page.goto(
                "https://mail.google.com/mail/u/0/#search/rakuten+OR+flexoffers+OR+ascend+OR+partnerize+OR+cj+OR+awin+OR+impact",
                wait_until="domcontentloaded",
                timeout=90000,
            )
            time.sleep(5)
            body = page.locator("body").inner_text()
            page.screenshot(path=str(SHOTS / "gmail-reauth-search.png"), full_page=True)
            (ROOT / "gmail-reauth-search.txt").write_text(f"{page.url}\n\n{body[:15000]}", encoding="utf-8")
            result["search_snip"] = body[:2500]
            print("SEARCH", body[:700].replace("\n", " | "))
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("RESULT", json.dumps(result, indent=2)[:1500])
        time.sleep(2)
        ctx.close()


if __name__ == "__main__":
    main()

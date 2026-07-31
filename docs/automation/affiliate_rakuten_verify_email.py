"""Find Rakuten verify-email message in Gmail and open the confirmation link."""
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
OUT = ROOT / "rakuten-verify-email-RESULT.json"


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
        mail = ctx.pages[0] if ctx.pages else ctx.new_page()
        mail.goto(
            "https://mail.google.com/mail/u/0/#search/rakuten+OR+from%3Arakuten+newer_than%3A1d",
            wait_until="domcontentloaded",
            timeout=120000,
        )
        time.sleep(6)
        shot(mail, "20-gmail-search")
        result["steps"].append({"step": "search", "url": mail.url, "body": mail.inner_text("body")[:2000]})

        # Open first matching row
        opened = mail.evaluate(
            """() => {
            const rows = [...document.querySelectorAll('tr.zA')].filter(r => r.offsetParent !== null);
            const hit = rows.find(r => /rakuten|verify|confirm/i.test(r.innerText || ''));
            if (hit) { hit.click(); return (hit.innerText || '').slice(0, 200); }
            if (rows[0]) { rows[0].click(); return (rows[0].innerText || '').slice(0, 200); }
            return null;
        }"""
        )
        time.sleep(4)
        shot(mail, "21-gmail-open")
        body = mail.inner_text("div[role='main']")
        result["steps"].append({"step": "opened", "row": opened, "body": body[:3000]})

        # Collect candidate verification links
        hrefs = mail.evaluate(
            """() => [...document.querySelectorAll('div[role=\"main\"] a[href]')]
                .map(a => a.href)
                .filter(h => /rakuten|verify|confirm|execute-actions|auth/i.test(h))
            """
        )
        result["links"] = hrefs[:20]

        verify_url = None
        for h in hrefs:
            if re.search(r"verify|confirm|execute-actions|action-token|email", h, re.I):
                verify_url = h
                break
        if not verify_url and hrefs:
            verify_url = hrefs[0]

        if verify_url:
            page = ctx.new_page()
            page.goto(verify_url, wait_until="domcontentloaded", timeout=120000)
            time.sleep(6)
            shot(page, "22-verify-click")
            result["steps"].append(
                {
                    "step": "verify_nav",
                    "url": page.url,
                    "title": page.title(),
                    "body": page.inner_text("body")[:2500],
                }
            )
            # Follow to dashboard
            page.goto("https://publisher.rakutenadvertising.com/", wait_until="domcontentloaded", timeout=120000)
            time.sleep(8)
            shot(page, "23-dash-after-verify")
            result["steps"].append(
                {
                    "step": "dash_after",
                    "url": page.url,
                    "title": page.title(),
                    "body": page.inner_text("body")[:3000],
                }
            )
            result["status"] = "verified_or_attempted"
        else:
            # Also check spam
            mail.goto(
                "https://mail.google.com/mail/u/0/#search/in%3Aspam+rakuten",
                wait_until="domcontentloaded",
                timeout=90000,
            )
            time.sleep(5)
            shot(mail, "24-spam-search")
            result["steps"].append({"step": "spam", "body": mail.inner_text("body")[:2000]})
            result["status"] = "no_verify_link_found"

        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps({"status": result.get("status"), "links": result.get("links", [])[:5], "steps": len(result["steps"])}, indent=2))
        ctx.close()


if __name__ == "__main__":
    main()

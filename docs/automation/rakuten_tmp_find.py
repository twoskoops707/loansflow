"""Rakuten find-advertisers with disposable profile (avoids lock)."""
from __future__ import annotations

import json
import re
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROF = ROOT / ".chrome-rakuten-tmp"
SHOTS = ROOT / "outreach-shots"
TAG = "rakuten-tmp"
OUT = ROOT / f"{TAG}-RESULT.json"
PASSWORD = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"


def dump(page, name: str) -> str:
    body = page.locator("body").inner_text(timeout=20000)[:25000]
    (ROOT / f"{TAG}-{name}.txt").write_text(f"{page.url}\n\n{body}", encoding="utf-8")
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"{TAG}-{name}.png"), full_page=True)
    print(name, page.url)
    print(body[:1000].replace("\n", " | "))
    return body


def main() -> None:
    if PROF.exists():
        shutil.rmtree(PROF, ignore_errors=True)
    PROF.mkdir(parents=True)
    result = {"at": datetime.now(timezone.utc).isoformat(), "steps": [], "hrefs": [], "applied": []}
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROF),
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1400, "height": 950},
        )
        page = ctx.new_page()
        page.goto("https://publisher.rakutenadvertising.com/", wait_until="domcontentloaded", timeout=120000)
        time.sleep(5)
        page.locator("input#username, input[name='username'], input[type='email']").first.fill(EMAIL)
        page.locator("input[type='password']").first.fill(PASSWORD)
        page.get_by_role("button", name=re.compile(r"Log ?in", re.I)).first.click()
        time.sleep(10)
        result["steps"].append("login")
        dump(page, "01-home")

        for t in ("View Advertisers", "ADVERTISERS"):
            if page.get_by_text(t, exact=False).count():
                page.get_by_text(t, exact=False).first.click()
                time.sleep(5)
                result["steps"].append(f"click:{t}")
                break
        dump(page, "02-advertisers")

        hrefs = page.eval_on_selector_all(
            "a[href]",
            "els => els.map(e => ({t:(e.innerText||'').trim().slice(0,60), h:e.href}))"
            ".filter(x => /advertis|discover|find|market|join|partner/i.test((x.h||'')+(x.t||''))).slice(0,60)",
        )
        result["hrefs"] = hrefs
        print("HREFS", json.dumps(hrefs, indent=2)[:2500])

        page.get_by_text("ADVERTISERS", exact=True).first.hover()
        time.sleep(1.5)
        for t in ("Find Advertisers", "Discover", "Browse", "Search Advertisers", "Directory"):
            loc = page.get_by_text(t, exact=False)
            if loc.count() and loc.first.is_visible():
                try:
                    loc.first.click()
                    time.sleep(4)
                    result["steps"].append(f"menu:{t}")
                    dump(page, "03-" + re.sub(r"[^a-z]+", "-", t.lower()))
                    break
                except Exception as e:
                    result["steps"].append(f"menu_err:{t}:{e}")

        for h in hrefs:
            url = h.get("h") or ""
            if "publisher.rakutenadvertising.com" not in url:
                continue
            if not re.search(r"find|discover|market|browse|search", url, re.I):
                continue
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            time.sleep(4)
            b = dump(page, "href-" + re.sub(r"[^a-z0-9]+", "-", url.split(".com/")[-1])[:40])
            result["steps"].append(f"open:{url}")
            if re.search(r"\bJoin\b|\bApply\b", b):
                btns = page.get_by_role("button", name=re.compile(r"Join|Apply|Request", re.I))
                for i in range(min(btns.count(), 5)):
                    try:
                        label = btns.nth(i).inner_text()[:50]
                        btns.nth(i).click()
                        time.sleep(2)
                        conf = page.get_by_role("button", name=re.compile(r"Submit|Confirm|Apply|Send|OK|Join", re.I))
                        if conf.count() and conf.first.is_visible():
                            conf.first.click()
                            time.sleep(2)
                        result["applied"].append(label)
                    except Exception as e:
                        result["applied"].append(f"fail:{e}")
                break

        # Account / profile completion
        page.goto("https://publisher.rakutenadvertising.com/account", wait_until="domcontentloaded", timeout=60000)
        time.sleep(4)
        dump(page, "04-account")

        result["final_url"] = page.url
        result["final_snip"] = page.locator("body").inner_text()[:2500]
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("RESULT", json.dumps({k: result.get(k) for k in ("steps", "applied", "final_url")}, indent=2))
        ctx.close()


if __name__ == "__main__":
    main()

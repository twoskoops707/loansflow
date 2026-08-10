"""Apply to specific finance-relevant Rakuten offers (View offer → Join)."""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROF = ROOT / ".chrome-rakuten-alt"
PASS = (ROOT / ".secret-rakuten-password.txt").read_text(encoding="utf-8").strip()
EMAIL = "loansflow707@gmail.com"
TAG = "rakuten-apply-fin"
OUT = ROOT / f"{TAG}-RESULT.json"
SHOTS = ROOT / "outreach-shots"

QUERIES = ("bank", "credit", "loan", "finance", "lend", "mortgage", "insurance")


def dump(page, name: str) -> str:
    body = page.locator("body").inner_text(timeout=20000)[:30000]
    (ROOT / f"{TAG}-{name}.txt").write_text(f"{page.url}\n\n{body}", encoding="utf-8")
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"{TAG}-{name}.png"), full_page=True)
    print(name, page.url)
    print(body[:1000].replace("\n", " | "))
    return body


def main() -> None:
    result = {"at": datetime.now(timezone.utc).isoformat(), "applied": [], "skipped": [], "steps": []}
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROF),
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1400, "height": 950},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto("https://publisher.rakutenadvertising.com/", wait_until="domcontentloaded", timeout=120000)
        time.sleep(5)
        if page.locator("input[type='password']").count() and page.locator("input[type='password']").first.is_visible():
            page.locator("input#username, input[name='username'], input[type='email']").first.fill(EMAIL)
            page.locator("input[type='password']").first.fill(PASS)
            page.get_by_role("button", name=re.compile(r"Log ?in", re.I)).first.click()
            time.sleep(8)

        for q in QUERIES:
            page.goto(
                f"https://publisher.rakutenadvertising.com/offers?query={q}&index=offers",
                wait_until="domcontentloaded",
                timeout=90000,
            )
            time.sleep(5)
            body = dump(page, f"q-{q}")
            if "couldn't find any results" in body.lower():
                result["skipped"].append(f"no_results:{q}")
                continue

            # Click each View offer (up to 6)
            views = page.get_by_role("link", name=re.compile(r"View offer", re.I))
            if not views.count():
                views = page.get_by_text("View offer", exact=False)
            count = min(views.count(), 6)
            for i in range(count):
                try:
                    # refresh list each time
                    page.goto(
                        f"https://publisher.rakutenadvertising.com/offers?query={q}&index=offers",
                        wait_until="domcontentloaded",
                        timeout=90000,
                    )
                    time.sleep(4)
                    views = page.get_by_text("View offer", exact=False)
                    if i >= views.count():
                        break
                    # capture nearby advertiser name from body lines
                    views.nth(i).click()
                    time.sleep(4)
                    detail = dump(page, f"offer-{q}-{i}")
                    status = "unknown"
                    if re.search(r"Partnership pending|pending approval|Already partnered|Joined", detail, re.I):
                        status = "already_pending_or_joined"
                        result["skipped"].append(f"{q}:{i}:{status}")
                    else:
                        joined = False
                        for label in (r"^Join$", r"^Apply$", r"^Request$", r"Join program", r"Apply to"):
                            btn = page.get_by_role("button", name=re.compile(label, re.I))
                            if btn.count() and btn.first.is_visible():
                                btn.first.click()
                                time.sleep(2)
                                conf = page.get_by_role(
                                    "button",
                                    name=re.compile(r"Submit|Confirm|Apply|Send|OK|Join|Yes", re.I),
                                )
                                if conf.count() and conf.first.is_visible():
                                    conf.first.click()
                                    time.sleep(2)
                                joined = True
                                result["applied"].append({"q": q, "i": i, "snip": detail[:400]})
                                print("JOINED", q, i)
                                break
                        if not joined:
                            # try link Join
                            link = page.get_by_role("link", name=re.compile(r"Join|Apply", re.I))
                            if link.count() and link.first.is_visible():
                                link.first.click()
                                time.sleep(3)
                                result["applied"].append({"q": q, "i": i, "via": "link", "snip": detail[:400]})
                            else:
                                result["skipped"].append(f"{q}:{i}:no_join_btn")
                except Exception as e:
                    result["skipped"].append(f"{q}:{i}:err:{e}")

        # Summary My Advertisers
        page.goto("https://publisher.rakutenadvertising.com/advertisers", wait_until="domcontentloaded", timeout=60000)
        time.sleep(5)
        result["my_advertisers"] = dump(page, "my-advertisers")[:2000]
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(
            "RESULT",
            json.dumps(
                {
                    "applied_n": len(result["applied"]),
                    "skipped": result["skipped"][:20],
                    "applied": result["applied"][:10],
                },
                indent=2,
            )[:3000],
        )
        ctx.close()


if __name__ == "__main__":
    main()

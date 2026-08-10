"""Join finance advertisers via Rakuten /advertisers/search and /offers."""
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
TAG = "rakuten-join"
OUT = ROOT / f"{TAG}-RESULT.json"
SHOTS = ROOT / "outreach-shots"


def dump(page, name: str) -> str:
    body = page.locator("body").inner_text(timeout=20000)[:30000]
    (ROOT / f"{TAG}-{name}.txt").write_text(f"{page.url}\n\n{body}", encoding="utf-8")
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"{TAG}-{name}.png"), full_page=True)
    print(name, page.url)
    print(body[:1100].replace("\n", " | "))
    return body


def apply_visible(page, result: dict, limit: int = 8) -> None:
    for role in ("button", "link"):
        locs = page.get_by_role(role, name=re.compile(r"^(Join|Apply|Request|Get links)$", re.I))
        n = min(locs.count(), limit)
        for i in range(n):
            try:
                label = locs.nth(i).inner_text()[:60]
                locs.nth(i).click(timeout=4000)
                time.sleep(2)
                conf = page.get_by_role("button", name=re.compile(r"Submit|Confirm|Apply|Send|OK|Join|Yes", re.I))
                if conf.count() and conf.first.is_visible():
                    conf.first.click()
                    time.sleep(2)
                result["applied"].append(label)
                print("APPLIED", label)
            except Exception as e:
                result["applied"].append(f"fail:{e}")


def main() -> None:
    result = {"at": datetime.now(timezone.utc).isoformat(), "steps": [], "applied": []}
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROF),
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1400, "height": 950},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto("https://publisher.rakutenadvertising.com/", wait_until="domcontentloaded", timeout=120000)
        time.sleep(6)
        if page.locator("input[type='password']").count() and page.locator("input[type='password']").first.is_visible():
            page.locator("input#username, input[name='username'], input[type='email']").first.fill(EMAIL)
            page.locator("input[type='password']").first.fill(PASS)
            page.get_by_role("button", name=re.compile(r"Log ?in", re.I)).first.click()
            time.sleep(10)
            result["steps"].append("login")

        for url in (
            "https://publisher.rakutenadvertising.com/advertisers/search",
            "https://publisher.rakutenadvertising.com/offers",
        ):
            page.goto(url, wait_until="domcontentloaded", timeout=90000)
            time.sleep(6)
            slug = url.rstrip("/").split("/")[-1]
            body = dump(page, f"01-{slug}")
            result["steps"].append(f"open:{url}")

            search = page.locator("input[type='search'], input[placeholder*='Search' i], input[aria-label*='Search' i]")
            if search.count() and search.first.is_visible():
                for q in ("mortgage", "loan", "finance", "credit card", "insurance"):
                    search.first.fill(q)
                    search.first.press("Enter")
                    time.sleep(5)
                    dump(page, f"search-{slug}-{q.replace(' ', '-')}")
                    apply_visible(page, result, limit=5)
                    result["steps"].append(f"search:{q}")
                    break
            else:
                apply_visible(page, result, limit=8)

            # category chips
            for cat in ("Finance", "Financial Services", "Banking", "Insurance", "Mortgage"):
                loc = page.get_by_text(cat, exact=False)
                if loc.count() and loc.first.is_visible():
                    try:
                        loc.first.click()
                        time.sleep(4)
                        dump(page, f"cat-{slug}-{cat.replace(' ', '-')}")
                        apply_visible(page, result, limit=5)
                        result["steps"].append(f"cat:{cat}")
                    except Exception:
                        pass

        result["final_url"] = page.url
        result["final_snip"] = page.locator("body").inner_text()[:2500]
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("RESULT", json.dumps({k: result.get(k) for k in ("steps", "applied", "final_url")}, indent=2))
        ctx.close()


if __name__ == "__main__":
    main()

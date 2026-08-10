"""Wait for offer results then open View offer and Join finance ones."""
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
OUT = ROOT / "rakuten-apply2-RESULT.json"
SHOTS = ROOT / "outreach-shots"


def main() -> None:
    result = {"at": datetime.now(timezone.utc).isoformat(), "applied": [], "notes": []}
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

        for q in ("bank", "credit"):
            page.goto(
                f"https://publisher.rakutenadvertising.com/offers?query={q}&index=offers",
                wait_until="domcontentloaded",
                timeout=90000,
            )
            try:
                page.wait_for_function(
                    "() => /Showing|results for|couldn't find/i.test(document.body.innerText)",
                    timeout=35000,
                )
            except Exception as e:
                result["notes"].append(f"waitfail:{q}:{e}")
            time.sleep(2)
            body = page.locator("body").inner_text()
            (ROOT / f"rakuten-apply2-{q}.txt").write_text(f"{page.url}\n\n{body[:25000]}", encoding="utf-8")
            print(q, body[:700].replace("\n", " | "))
            if "couldn't find" in body.lower():
                continue

            # Prefer finance-ish names
            targets = []
            for name in (
                "EQ Bank",
                "Cleo",
                "Masseys",
                "Jos. A. Bank",
                "View offer",
            ):
                if name.lower() in body.lower() or name == "View offer":
                    targets.append(name)

            views = page.locator("text=View offer")
            n = min(views.count(), 5)
            for i in range(n):
                page.goto(
                    f"https://publisher.rakutenadvertising.com/offers?query={q}&index=offers",
                    wait_until="domcontentloaded",
                    timeout=90000,
                )
                try:
                    page.wait_for_function(
                        "() => /Showing|results for/i.test(document.body.innerText)",
                        timeout=35000,
                    )
                except Exception:
                    pass
                time.sleep(2)
                views = page.locator("text=View offer")
                if i >= views.count():
                    break
                views.nth(i).click()
                time.sleep(5)
                detail = page.locator("body").inner_text()
                SHOTS.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(SHOTS / f"rakuten-apply2-{q}-{i}.png"), full_page=True)
                (ROOT / f"rakuten-apply2-detail-{q}-{i}.txt").write_text(
                    f"{page.url}\n\n{detail[:20000]}", encoding="utf-8"
                )
                print("DETAIL", q, i, detail[:500].replace("\n", " | "))

                if re.search(r"pending approval|Already partnered|Joined", detail, re.I):
                    result["notes"].append(f"{q}:{i}:already")
                    continue

                clicked = False
                # Primary apply on detail page
                apply_btn = page.locator('[data-cy="partnership-apply-btn"], button:has-text("Apply")')
                if apply_btn.count() and apply_btn.first.is_visible():
                    try:
                        apply_btn.first.click(timeout=5000)
                        time.sleep(2)
                        clicked = True
                    except Exception:
                        apply_btn.first.click(force=True)
                        time.sleep(2)
                        clicked = True

                # Modal confirm inside ModalContainer
                time.sleep(1)
                modal = page.locator(".ModalContainer__ac17d923, [role='dialog'], .modal")
                if modal.count():
                    # checkboxes / agree
                    for lab in ("I agree", "Agree", "Terms", "confirm"):
                        cb = page.get_by_text(re.compile(lab, re.I))
                        if cb.count() and cb.first.is_visible():
                            try:
                                cb.first.click(force=True)
                                time.sleep(0.5)
                            except Exception:
                                pass
                    checks = page.locator("input[type='checkbox']")
                    for j in range(min(checks.count(), 5)):
                        try:
                            if not checks.nth(j).is_checked():
                                checks.nth(j).check(force=True)
                        except Exception:
                            pass
                    conf = page.locator(
                        '[data-cy="partnership-apply-btn"], button:has-text("Apply"), button:has-text("Submit"), button:has-text("Confirm"), button:has-text("Send")'
                    )
                    for j in range(min(conf.count(), 5)):
                        try:
                            if conf.nth(j).is_visible():
                                conf.nth(j).click(force=True)
                                time.sleep(2)
                                result["applied"].append({"q": q, "i": i, "via": "modal", "url": page.url})
                                print("APPLIED_MODAL", q, i)
                                clicked = True
                                break
                        except Exception as e:
                            result["notes"].append(f"modal_err:{q}:{i}:{e}")

                if not clicked:
                    for lab in (r"Join", r"Apply", r"Request partnership", r"Join program"):
                        btn = page.get_by_role("button", name=re.compile(lab, re.I))
                        if btn.count() and btn.first.is_visible():
                            try:
                                btn.first.click(force=True, timeout=5000)
                                time.sleep(2)
                                result["applied"].append({"q": q, "i": i, "btn": lab, "url": page.url})
                                clicked = True
                                print("APPLIED", q, i, lab)
                                break
                            except Exception as e:
                                result["notes"].append(f"btn_err:{q}:{i}:{e}")
                if not clicked:
                    result["notes"].append(f"{q}:{i}:no_btn")
                # don't also run the old all_btns loop
                continue

                if False:
                    all_btns = page.locator("button")
                    for j in range(min(all_btns.count(), 30)):
                        try:
                            t = all_btns.nth(j).inner_text().strip()
                        except Exception:
                            continue
                        if re.search(r"join|apply", t, re.I):
                            all_btns.nth(j).click()
                            time.sleep(2)
                            result["applied"].append({"q": q, "i": i, "btn": t, "url": page.url})
                            print("APPLIED_TEXT", q, i, t)
                            clicked = True
                            break
                if not clicked:
                    result["notes"].append(f"{q}:{i}:no_btn")

        page.goto("https://publisher.rakutenadvertising.com/advertisers", wait_until="domcontentloaded", timeout=60000)
        time.sleep(6)
        result["my_adv"] = page.locator("body").inner_text()[:2500]
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("RESULT", json.dumps(result, indent=2)[:2500])
        ctx.close()


if __name__ == "__main__":
    main()

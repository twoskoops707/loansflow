"""Register LoansFlow as free Rakuten Advertising publisher."""
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
OUT = ROOT / "rakuten-register-RESULT.json"
PW_FILE = ROOT / ".secret-rakuten-password.txt"
GMAIL_PW = ROOT / ".secret-gmail-password.txt"

EMAIL = "Loans.flow.loan@gmail.com"
SITE = "https://loansflow.loan/"
REGISTER_URL = "https://publisher.rakutenadvertising.com/register"
# Prefer dedicated Rakuten password file; fall back to known partner password.
PASSWORD = (
    (PW_FILE.read_text(encoding="utf-8").strip() if PW_FILE.exists() else "")
    or "LoansFlow!Partner2026"
)


def ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def shot(page, name: str) -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    path = SHOTS / f"rakuten-{name}.png"
    page.screenshot(path=str(path), full_page=True)
    return str(path)


def dump_fields(page) -> list[dict]:
    return page.evaluate(
        """() => [...document.querySelectorAll('input, select, textarea')].map(el => ({
          tag: el.tagName.toLowerCase(),
          type: (el.type || '').toLowerCase(),
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          aria: el.getAttribute('aria-label') || '',
          label: (() => {
            if (el.id) {
              const lab = document.querySelector(`label[for="${el.id}"]`);
              if (lab) return (lab.innerText || '').trim().slice(0, 80);
            }
            const p = el.closest('label');
            return p ? (p.innerText || '').trim().slice(0, 80) : '';
          })(),
          visible: !!(el.offsetParent || el.getClientRects().length),
          value: (el.value || '').slice(0, 40),
          options: el.tagName.toLowerCase() === 'select'
            ? [...el.options].slice(0, 12).map(o => o.textContent.trim().slice(0, 40))
            : []
        }))"""
    )


def fill_first(page, selectors: list[str], value: str) -> bool:
    for sel in selectors:
        loc = page.locator(sel).first
        try:
            if loc.count() and loc.is_visible():
                loc.fill(value)
                return True
        except Exception:
            continue
    return False


def select_first(page, selectors: list[str], *labels: str) -> bool:
    for sel in selectors:
        loc = page.locator(sel).first
        try:
            if not loc.count() or not loc.is_visible():
                continue
            for lab in labels:
                try:
                    loc.select_option(label=re.compile(lab, re.I))
                    return True
                except Exception:
                    try:
                        loc.select_option(value=lab)
                        return True
                    except Exception:
                        continue
        except Exception:
            continue
    return False


def click_first(page, selectors: list[str]) -> bool:
    for sel in selectors:
        loc = page.locator(sel).first
        try:
            if loc.count() and loc.is_visible():
                loc.click(timeout=5000)
                return True
        except Exception:
            continue
    return False


def body_text(page) -> str:
    try:
        return page.inner_text("body")
    except Exception:
        return ""


def main() -> None:
    if not PW_FILE.exists():
        PW_FILE.write_text(PASSWORD + "\n", encoding="utf-8")

    result: dict = {
        "time": ts(),
        "email": EMAIL,
        "site": SITE,
        "url": REGISTER_URL,
        "steps": [],
        "status": "started",
    }

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE),
            channel="chrome",
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1280, "height": 900},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        page.goto(REGISTER_URL, wait_until="domcontentloaded", timeout=120000)
        time.sleep(4)
        # Follow redirects / https
        if "http://" in page.url and "register" in page.url:
            page.goto(
                REGISTER_URL.replace("http://", "https://"),
                wait_until="domcontentloaded",
                timeout=120000,
            )
            time.sleep(3)

        shot(page, "01-start")
        fields = dump_fields(page)
        result["steps"].append(
            {
                "step": "load",
                "url": page.url,
                "title": page.title(),
                "fields": fields,
                "body_snip": body_text(page)[:1500],
            }
        )

        lower = body_text(page).lower()
        if any(x in lower for x in ("captcha", "recaptcha", "hcaptcha", "cf-turnstile", "verify you are human")):
            # Soft detect — only abort if widgets dominate and we can't proceed
            captcha_widgets = page.locator(
                "iframe[src*='recaptcha'], iframe[src*='hcaptcha'], iframe[src*='turnstile'], .g-recaptcha, #cf-turnstile"
            ).count()
            if captcha_widgets:
                result["status"] = "blocked_captcha"
                result["captcha_widgets"] = captcha_widgets
                shot(page, "captcha-wall")
                OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
                print(json.dumps(result, indent=2))
                ctx.close()
                return

        # Common publisher registration fields
        filled = {
            "email": fill_first(
                page,
                [
                    "input[type='email']",
                    "input[name*='email' i]",
                    "input[id*='email' i]",
                    "input[placeholder*='email' i]",
                    "input[aria-label*='email' i]",
                ],
                EMAIL,
            ),
            "confirm_email": fill_first(
                page,
                [
                    "input[name*='confirm' i][name*='email' i]",
                    "input[id*='confirm' i][id*='email' i]",
                    "input[placeholder*='confirm' i]",
                    "input[aria-label*='confirm' i]",
                ],
                EMAIL,
            ),
            "password": fill_first(
                page,
                [
                    "input[type='password']",
                    "input[name*='password' i]",
                    "input[id*='password' i]",
                ],
                PASSWORD,
            ),
            "first_name": fill_first(
                page,
                [
                    "input[name*='first' i]",
                    "input[id*='first' i]",
                    "input[placeholder*='first' i]",
                    "input[aria-label*='first' i]",
                ],
                "LoansFlow",
            ),
            "last_name": fill_first(
                page,
                [
                    "input[name*='last' i]",
                    "input[id*='last' i]",
                    "input[placeholder*='last' i]",
                    "input[aria-label*='last' i]",
                ],
                "Partnerships",
            ),
            "company": fill_first(
                page,
                [
                    "input[name*='company' i]",
                    "input[id*='company' i]",
                    "input[name*='org' i]",
                    "input[placeholder*='company' i]",
                    "input[aria-label*='company' i]",
                    "input[name*='business' i]",
                ],
                "LoansFlow",
            ),
            "website": fill_first(
                page,
                [
                    "input[name*='website' i]",
                    "input[id*='website' i]",
                    "input[name*='url' i]",
                    "input[name*='site' i]",
                    "input[placeholder*='website' i]",
                    "input[placeholder*='http' i]",
                    "input[aria-label*='website' i]",
                    "input[type='url']",
                ],
                SITE,
            ),
            "phone": fill_first(
                page,
                [
                    "input[type='tel']",
                    "input[name*='phone' i]",
                    "input[id*='phone' i]",
                    "input[placeholder*='phone' i]",
                ],
                "5550100000",
            ),
        }

        # Confirm password if second password field empty
        pw_inputs = page.locator("input[type='password']:visible")
        try:
            if pw_inputs.count() >= 2:
                pw_inputs.nth(1).fill(PASSWORD)
                filled["confirm_password"] = True
        except Exception:
            filled["confirm_password"] = False

        select_first(
            page,
            ["select[name*='country' i]", "select[id*='country' i]", "select[aria-label*='country' i]"],
            "United States",
            "USA",
            "US",
        )
        select_first(
            page,
            ["select[name*='type' i]", "select[id*='type' i]", "select[name*='publisher' i]"],
            "Website",
            "Content",
            "Publisher",
            "Media",
        )

        # Accept terms checkboxes
        try:
            boxes = page.locator("input[type='checkbox']:visible")
            for i in range(boxes.count()):
                try:
                    boxes.nth(i).check(force=True)
                except Exception:
                    try:
                        boxes.nth(i).click(force=True)
                    except Exception:
                        pass
        except Exception:
            pass

        shot(page, "02-filled")
        result["steps"].append({"step": "filled", "filled": filled, "url": page.url})

        # Submit
        submitted = click_first(
            page,
            [
                "button[type='submit']",
                "input[type='submit']",
                "button:has-text('Register')",
                "button:has-text('Sign Up')",
                "button:has-text('Sign up')",
                "button:has-text('Create')",
                "button:has-text('Continue')",
                "button:has-text('Next')",
                "button:has-text('Submit')",
                "a:has-text('Register')",
                "text=Create Account",
            ],
        )
        time.sleep(5)
        shot(page, "03-after-submit")
        after = body_text(page)
        result["steps"].append(
            {
                "step": "after_submit",
                "submitted_click": submitted,
                "url": page.url,
                "title": page.title(),
                "body_snip": after[:2000],
                "fields": dump_fields(page),
            }
        )

        # Multi-step: try fill website / media details if new fields appeared
        if fill_first(
            page,
            [
                "input[name*='website' i]",
                "input[id*='website' i]",
                "input[type='url']",
                "input[placeholder*='website' i]",
            ],
            SITE,
        ):
            filled["website_step2"] = True
            click_first(
                page,
                [
                    "button[type='submit']",
                    "button:has-text('Continue')",
                    "button:has-text('Next')",
                    "button:has-text('Submit')",
                    "button:has-text('Finish')",
                    "button:has-text('Create')",
                ],
            )
            time.sleep(4)
            shot(page, "04-step2")
            after = body_text(page)
            result["steps"].append(
                {
                    "step": "step2",
                    "url": page.url,
                    "body_snip": after[:2000],
                }
            )

        al = after.lower()
        if any(
            k in al
            for k in (
                "thank you",
                "application received",
                "successfully",
                "check your email",
                "verify your email",
                "welcome",
                "dashboard",
                "registration complete",
                "account created",
                "pending review",
                "under review",
            )
        ):
            result["status"] = "submitted_or_created"
        elif "captcha" in al or page.locator("iframe[src*='recaptcha'], iframe[src*='hcaptcha']").count():
            result["status"] = "blocked_captcha"
        elif not any(filled.values()):
            result["status"] = "form_not_found"
        else:
            result["status"] = "partial_or_unknown"

        result["final_url"] = page.url
        result["final_title"] = page.title()
        shot(page, "05-final")
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps({k: result[k] for k in ("time", "status", "final_url", "final_title")}, indent=2))
        print("FULL_RESULT", OUT)
        ctx.close()


if __name__ == "__main__":
    main()

# LoansFlow AdSense unit map

Publisher: `ca-pub-6588738221262894` (twskoops@gmail.com account, switched 2026-09-22 — prior `ca-pub-7523216981025331` under loansflow707@gmail.com sat stuck in "Requires review")  
Primary loader: `public/js/ads.js` (AdSense) — the only ad stack on the site. Ezoic's JS, CMP and analytics were removed on 2026-10-02: they were blocking the main thread ~3.2s per page load (vs AdSense's 0.48s), injecting styles into our ad containers, and adding third-party cookies while producing no revenue (Incubator never connected). `public/js/ezoic-boot.js` is deleted. If Ezoic is ever re-enabled, its CMP is what provides EEA consent signalling for AdSense — reinstate both together, not one.

Named ad units are being created one at a time under the new account and wired in via `data-ad-unit` on each `.ad-slot` div (see table below). Units without a real slot ID still request by client + format and collapse when unfilled — this is a fallback for units not yet created, not the intended end state.

Slot IDs now live in one place: the `units` map at the top of `public/js/ads.js` (`units: { 'slot-name': 'slot ID' }`). A slot looks up its `data-ad-name` there unless the element carries its own `data-ad-unit`. Create each unit in AdSense (Ads > By ad unit > Display ads), paste the ID into the map, deploy. Auto Ads stay ON for the domain and serve regardless.

| Name | Slot ID |
|------|---------|
| `home-top` | `7525616235` (no longer placed on the page; the home page is intentionally ad-free) |
| everything else | not yet created |

## Where the slots are

| Name | Format | Where |
|------|--------|-------|
| `<loan>-mid` | rectangle | Loan pages: after the calculators and figures, before "How to apply" |
| `<loan>-side` | rectangle (300x250) | Loan pages: bottom of the sticky sidebar (desktop; stacks below on tablets and phones) |
| `loans-index`, `news-mid`, `wisdom-mid`, `alt-mid`, `grants-mid` | rectangle | Mid-page on the matching page |
| `calc-help-side` | rectangle | Calculator Help sidebar |
| guides | rectangle | One slot near the top of each guide (existing pages) |

`<loan>` is one of `sba-7a`, `sba-504`, `sba-express`, `sba-microloan`, `line-of-credit`, `commercial-term-loan`, `equipment-financing`, `mortgage`.

Placement rules: keep ads away from inputs and buttons (accidental clicks violate AdSense policy), never click your own ads, and never put affiliate links inside an ad slot. Affiliate and partner links go in the `lf-offers` block (see `public/data/offers.json`), which is labeled "Sponsored partner options" and only renders offers marked `live`.

## Empty-fill behavior

- `ads.js` labels each unit “Advertisement”, pushes AdSense, then watches `data-ad-status` / iframe presence.
- Unfilled units get `data-ad-state="empty"` and are hidden (no dashed placeholder left behind).
- Empty mobile anchors hide the whole `.ad-anchor` bar.
- A slot is only collapsed once: if AdSense reports `unfilled`, `blocked`, or `error` it is final and the watcher stops.
- If no status arrives within `emptyCollapseMs` (2.5s) the slot collapses early so no blank ad-sized box is held on screen, but the watcher keeps polling for `lateFillWatchMs` (90s). A slot that collapses and *then* reports `filled` is un-hidden again — before 2026-10-02 it stayed `display:none` forever, so any ad that rendered late was in the page but never visible.
- Slots render `data-ad-unit-state="wired"` when they have a real slot ID and `"client-only"` when they only send `data-ad-client`; DevTools → any `.ad-slot`.

## Verify a fill (2026-10-02, headless Chromium against the live site)

```bash
node /tmp/kilo/ads-probe.js https://loansflow.loan/   # per-slot state, status, network
```

Result: every request completes (no blocked/failed requests, no console errors) and **all four home slots report `data-ad-status="unfilled"`** — including `home-top`, which does have a slot ID. Nothing in the code blocks ads; AdSense is simply not filling. Two account-side items must clear:

1. Site approval state — docs recorded “Getting ready” / “Requires review”. Google serves no ads until the site is Ready.
2. Unit IDs — six of seven slots have no `data-ad-unit`. Confirm `7525616235` belongs to `ca-pub-6588738221262894` (units are account-scoped; an ID from the retired `ca-pub-7523216981025331` account will never fill) and create units for the rest, then paste the IDs into the `data-ad-unit` attributes.

## FamFlow note

Farm profile ads: `home_sponsored`, `tools_incontent`, `tools_anchor` (`automation/loansflow_site_profile.py`).  
In-content moved to **after** the first calculator panel (no longer mid line-item / mid-table). If tap coords miss, remap `tools_incontent` (and sticky `tools_anchor` if bottom padding changed).

## Deploy

```bash
# WSL — apex project loansflow-live
bash tools/browser/deploy-pages-wsl.sh
```

# LoansFlow AdSense unit map

Publisher: `ca-pub-6588738221262894` (twskoops@gmail.com account, switched 2026-09-22 — prior `ca-pub-7523216981025331` under loansflow707@gmail.com sat stuck in "Requires review")  
Primary loader: `public/js/ads.js` (AdSense). Ezoic JS remains in `<head>` for Incubator only — do not treat Ezoic as primary placements yet.

Named ad units are being created one at a time under the new account and wired in via `data-ad-unit` on each `.ad-slot` div (see table below). Units without a real slot ID still request by client + format and collapse when unfilled — this is a fallback for units not yet created, not the intended end state.

| Name | `data-ad-unit` slot ID |
|------|------------------------|
| `home-top` | `7525616235` |
| everything else | not yet created |

## Tools (`/tools/`) — highest RPM surface

| Name | Format | Where | Viewport |
|------|--------|-------|----------|
| `tools-top` | horizontal / responsive leaderboard | Above calculator main | All |
| `tools-sidebar` | rectangle (~300×250) | Left nav under step list | Desktop ≥901px only |
| `tools-incontent` | rectangle | After first calculator panel (every step) | All |
| `tools-anchor` | horizontal sticky | Fixed bottom bar | Mobile ≤900px only |
| `tools-news-mid` | fluid in-article | After news cards (Market News step only) | All |

**Typical visible density:** desktop = top + sidebar + in-content (3); mobile = top + in-content + sticky anchor (3).

## Home (`/`)

| Name | Format | Where |
|------|--------|-------|
| `home-top` | horizontal leaderboard | Above tool grid |
| `home-mid` | rectangle | After tool grid |
| `home-related` | multiplex (`autorelaxed`) | Monetize section |
| `home-prefooter` | horizontal | Above footer |

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

# LoansFlow AdSense unit map

Publisher: `ca-pub-7523216981025331`  
Primary loader: `public/js/ads.js` (AdSense). Ezoic JS remains in `<head>` for Incubator only — do not treat Ezoic as primary placements yet.

Slots omit hard-coded `data-ad-slot` IDs until AdSense finishes “Getting ready”; units still request by client + format and collapse when unfilled.

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

## FamFlow note

Farm profile ads: `home_sponsored`, `tools_incontent`, `tools_anchor` (`automation/loansflow_site_profile.py`).  
In-content moved to **after** the first calculator panel (no longer mid line-item / mid-table). If tap coords miss, remap `tools_incontent` (and sticky `tools_anchor` if bottom padding changed).

## Deploy

```bash
# WSL — apex project loansflow-live
bash tools/browser/deploy-pages-wsl.sh
```

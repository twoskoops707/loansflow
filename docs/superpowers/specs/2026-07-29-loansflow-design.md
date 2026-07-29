# LoansFlow — Design Spec

**Date:** 2026-07-29  
**Status:** Approved by owner proxy (full decision authority while AFK)  
**Contact:** loansflow707@gmail.com  
**Domain target:** loansflow.top (CapitalFlow TLDs unavailable)

## Product

Free SBA / commercial / mortgage calculator suite monetized with display ads (AdSense first → Ezoic at traffic threshold). Brand: **LoansFlow** (Flow product family).

## Locked decisions

| Decision | Choice |
|----------|--------|
| Brand | LoansFlow |
| Domain | loansflow.top (buy ASAP); chase .com later |
| Host | Cloudflare Pages |
| Repo | GitHub `twoskoops707/loansflow` |
| Stack | Static multi-page + SPA tools app (no SSR required) |
| Ads | Slot components + ads.txt; AdSense primary; Ezoic path documented |
| Email | loansflow707@gmail.com |

## Architecture

- `/` — marketing landing (brand-first, curb appeal)
- `/tools/` — full calculator SPA (ported math from source HTML)
- Legal pages: about, contact, privacy, terms, disclaimer
- `ads.txt`, `robots.txt`, `sitemap.xml`
- Ad slots: top, in-content, sticky anchor (env-gated publisher IDs)

## Visual direction

Midnight ink hero + warm brass accent + light “underwriting desk” tool chrome. Display: Syne. Body: Manrope. Mono: IBM Plex Mono. Avoid purple gradients, Inter, cream/terracotta cliché.

## Day-1 scope

Working calculators, redesign, ads placeholders, legal, repo, Pages deploy. Out of scope: live rate APIs, accounts, lead marketplace.

## Monetization path

1. Launch with labeled ad placeholders + privacy disclosures  
2. Apply Google AdSense; inject publisher ID when approved  
3. At ~10k sessions/mo evaluate Ezoic (mediation often pays better for finance)  
4. Later: mortgage/SBA affiliate units (higher RPM than display alone)

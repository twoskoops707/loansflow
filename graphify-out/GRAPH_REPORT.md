# Graph Report - site-redesign  (2026-11-02)

## Corpus Check
- 97 files · ~252,172 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .ico 1)

## Summary
- 750 nodes · 1149 edges · 63 communities (54 shown, 9 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8e3bdd48`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Guides and Calculator Help
- Ad and Affiliate Legal Terms
- Browser Automation Utilities
- Site Architecture and Ops Docs
- AdSense Check Scripts
- Tools Wizard Engine (app.js)
- Graft Hooks
- Embeddable Calculators (lf-calc)
- Mortgage and Amortization Math
- Market News Refresh Pipeline
- Ad and Affiliate Signup Automation
- Homepage Quick Estimate (home.js)
- JSON-LD Verification
- adsense-finish-verify.js
- market-news.js
- adsense-strict-verify-host.js
- package.json
- browser/package.json
- checklist.js
- directory.js
- ref_fs
- ref_path
- news.js
- adsense-go-live.js
- ezoic-join.js
- grants-embed.js
- adsense-add-loan-domain.js
- adsense-go-now.js
- ezoic-capture-snippet.js
- ezoic-signup.js
- ads.js
- porkbun-create-account.js
- playwright
- adsense-push-ads-now.js
- ezoic-export-snippet.js
- ezoic-setup.js
- contact.js
- adsense-gapfix-status.js
- adsense-onboard.js
- adsense-remove-unused-sites.js
- adsense-retry-tld.js
- adsense-start.js
- complete-adsense.js
- ezoic-capture-v2.js
- ezoic-connect.js
- ezoic-fill.js
- ezoic-robust.js
- adsense-accept.js
- adsense-verify.js
- buy-domain.js
- buy-domain-checkout.js
- buy-domain-finish.js
- extract-adsense-snippets.js
- map-loansflow.js
- offers.js
- graft skill (ask, grep, skeleton, callers, map)
- graft
- Refero Styles design-system library
- All slots unfilled: site approval and unit IDs
- deploy-pages-wsl.sh

## God Nodes (most connected - your core abstractions)
1. `playwright` - 40 edges
2. `LF` - 20 edges
3. `Guides Index` - 15 edges
4. `Calculator Help: Using Every LoansFlow Tool` - 14 edges
5. `LoansFlow homepage` - 14 edges
6. `Loan Glossary` - 13 edges
7. `How our numbers work (methodology)` - 13 edges
8. `Loan Documents: What Lenders Ask For, by Loan Type` - 12 edges
9. `SBA 7(a) 10-Step Playbook` - 11 edges
10. `LoansFlow Calculators Page (wizard shell)` - 11 edges

## Surprising Connections (you probably didn't know these)
- `graft skill (ask, grep, skeleton, callers, map)` --semantically_similar_to--> `graft skill (agents copy)`  [INFERRED] [semantically similar]
  .claude/skills/graft/SKILL.md → .agents/skills/graft/SKILL.md
- `Static multi-page plus tools SPA architecture` --references--> `ads.txt (AdSense pub-6588738221262894)`  [EXTRACTED]
  docs/superpowers/specs/2026-07-29-loansflow-design.md → public/ads.txt
- `Graft repo context graph` --references--> `graft skill (ask, grep, skeleton, callers, map)`  [INFERRED]
  AGENTS.md → .claude/skills/graft/SKILL.md
- `Marketplace and Broker Directory (Lendio, Fundera, Nav, etc.)` --semantically_similar_to--> `offers.js affiliate offers renderer`  [INFERRED] [semantically similar]
  public/guides/choosing-lender.html → public/tools/index.html
- `Five C's of Credit` --semantically_similar_to--> `Five C's of Credit (loan documents view)`  [INFERRED] [semantically similar]
  public/guides/checklist.html → public/guides/loan-documents.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Mortgage calculator step flow (Steps 3-7)** — public_guides_calculator_help_step3_mortgage_details, public_guides_calculator_help_step4_payment_breakdown, public_guides_calculator_help_step5_amortization_ledger, public_guides_calculator_help_step6_refinance, public_guides_calculator_help_step7_affordability [EXTRACTED 0.95]
- **Calculators sharing the monthly payment formula** — public_methodology_mortgage_payment, public_methodology_refinance_comparison, public_methodology_affordability, public_methodology_dscr [EXTRACTED 1.00]
- **Market news live API with static fallback refresh** — claude_md_market_news_function, claude_md_market_news_snapshot, github_workflows_refresh_market_news_refresh, tools_news_refresh_market_news [EXTRACTED 1.00]
- **Loan document preparation cluster** — public_guides_loan_documents, public_guides_checklist, public_guides_business_plan_for_a_loan, public_guides_loan_documents_sba_forms [INFERRED 0.85]
- **SBA program guides (7a, 504, Express/Microloans/CAPLines, Eligibility)** — public_guides_sba_7a_step_by_step, public_guides_sba_504, public_guides_sba_express_microloans_caplines, public_guides_sba_loan_eligibility [INFERRED 0.85]
- **LoansFlow site legal/trust pages** — public_privacy, public_terms, public_disclaimer, public_about, public_contact, public_methodology [INFERRED 0.85]
- **Monetization documents** — docs_legal_rate_card, docs_legal_publisher_terms_short_form, public_ads, docs_superpowers_specs_2026_07_29_loansflow_design_monetization_path [INFERRED 0.85]
- **AdSense plus affiliate monetization** — claude_md_public_js_ads, claude_md_public_js_offers, docs_ads_adsense_unit_map, docs_monetize_hold_policy, readme_ads_txt [INFERRED 0.85]

## Communities (63 total, 9 thin omitted)

### Community 0 - "Guides and Calculator Help"
Cohesion: 0.05
Nodes (74): Business Plan and Projections Lenders Want to See, Financial Projections with Stated Assumptions, Sources and Uses of Funds table, Calculator Help: Using Every LoansFlow Tool, Calculator Step 0: SBA and Commercial Loan, Calculator Step 1: Commercial Amortization, Calculator Step 2: Line of Credit, Calculator Step 3: Mortgage Loan Details (+66 more)

### Community 1 - "Ad and Affiliate Legal Terms"
Cohesion: 0.08
Nodes (38): LoansFlow Publisher Terms (Short-Form), FTC Endorsement Guides disclosures, LoansFlow Media / Affiliate Rate Card (placeholder), Affiliate performance models (CPL/CPA/rev share), Direct display ad units (CPM placeholders), LoansFlow Logo Options, Brand palette (ink #071018, teal #1a8f7c, brass #c9a45c), Logo Option D (editorial hybrid, shipped) (+30 more)

### Community 2 - "Browser Automation Utilities"
Cohesion: 0.08
Nodes (11): decrypt(), get_key(), main(), decrypt(), decrypt(), api(), gql(), main() (+3 more)

### Community 3 - "Site Architecture and Ops Docs"
Cohesion: 0.07
Nodes (34): LoansFlow static Cloudflare Pages site, functions/api/market-news.js Pages Function, public/data/market-news.json static fallback, public/js/ads.js AdSense slot loader, public/js/app.js calculator wizard, public/js/home.js homepage quick-estimate, public/js/offers.js affiliate renderer, Legacy Pages project loansflow (loansflow.pages.dev) (+26 more)

### Community 4 - "AdSense Check Scripts"
Cohesion: 0.26
Nodes (12): checkPlaced(), { chromium }, dismissVerifiedNext(), dump(), fetchText(), fs, https, OUT (+4 more)

### Community 5 - "Tools Wizard Engine (app.js)"
Cohesion: 0.08
Nodes (20): { chromium }, fs, https, OUT, path, TAG, { chromium }, fs (+12 more)

### Community 6 - "Graft Hooks"
Cohesion: 0.12
Nodes (20): best(), entry(), { execFileSync }, fromPkg(), fs, globalRoot(), newer(), path (+12 more)

### Community 7 - "Embeddable Calculators (lf-calc)"
Cohesion: 0.11
Nodes (15): call(), el(), params(), row(), search(), stats(), commas(), fieldHtml() (+7 more)

### Community 8 - "Mortgage and Amortization Math"
Cohesion: 0.40
Nodes (9): el(), initSearch(), close(), paint(), run(), loadIndex(), rates(), search() (+1 more)

### Community 9 - "Market News Refresh Pipeline"
Cohesion: 0.17
Nodes (16): refresh-market-news workflow (daily cron), articleFromItem(), buildPayload(), cleanSummary(), decodeXml(), deltaLabel(), __dirname, FEEDS (+8 more)

### Community 10 - "Ad and Affiliate Signup Automation"
Cohesion: 0.21
Nodes (18): applyAdSense(), applyAmazonAssociates(), applyEzoic(), applyMediavine(), { chromium }, ensureChrome(), fs, googleLogin() (+10 more)

### Community 13 - "JSON-LD Verification"
Cohesion: 0.11
Nodes (16): allDefined, allFiles, collectIds(), collectRefs(), everyId, files, FORBIDDEN, fs (+8 more)

### Community 14 - "adsense-finish-verify.js"
Cohesion: 0.22
Nodes (13): addSiteIfMissing(), { chromium }, dump(), ensureSession(), fs, https, OUT, path (+5 more)

### Community 15 - "market-news.js"
Cohesion: 0.27
Nodes (14): articleFromItem(), buildPayload(), cleanSummary(), decodeXml(), deltaLabel(), FEEDS, fetchText(), fmtPct() (+6 more)

### Community 16 - "adsense-strict-verify-host.js"
Cohesion: 0.23
Nodes (13): checkPlaced(), { chromium }, clickVerify(), dump(), fetchText(), fs, https, OUT (+5 more)

### Community 17 - "package.json"
Cohesion: 0.15
Nodes (12): description, engines, node, name, private, scripts, deploy, dev (+4 more)

### Community 18 - "browser/package.json"
Cohesion: 0.15
Nodes (12): author, dependencies, playwright, description, keywords, license, main, name (+4 more)

### Community 19 - "checklist.js"
Cohesion: 0.35
Nodes (11): buildChecklistText(), CHECKLIST_DATA, countAllItems(), countChecked(), handleDownload(), handleReset(), init(), loadState() (+3 more)

### Community 20 - "directory.js"
Cohesion: 0.42
Nodes (10): esc(), loadData(), matches(), render(), renderItem(), renderLenderCard(), renderNationalCard(), renderPartnerCard() (+2 more)

### Community 21 - "ref_fs"
Cohesion: 0.18
Nodes (8): { chromium }, fs, OUT, path, { chromium }, fs, OUT, path

### Community 22 - "ref_path"
Cohesion: 0.18
Nodes (8): { chromium }, fs, OUT, path, { chromium }, fs, OUT, path

### Community 23 - "news.js"
Cohesion: 0.57
Nodes (6): el(), filters(), fmtDate(), render(), safeUrl(), social()

### Community 24 - "adsense-go-live.js"
Cohesion: 0.22
Nodes (7): { chromium }, fs, loginIfNeeded(), OUT, PASS, path, sleep()

### Community 25 - "ezoic-join.js"
Cohesion: 0.22
Nodes (7): { chromium }, clickText(), fs, OUT, PASS_FILE, path, sleep()

### Community 28 - "adsense-add-loan-domain.js"
Cohesion: 0.22
Nodes (4): { chromium }, fs, OUT, path

### Community 29 - "adsense-go-now.js"
Cohesion: 0.25
Nodes (7): { chromium }, fs, loginIfNeeded(), OUT, PASS, path, sleep()

### Community 30 - "ezoic-capture-snippet.js"
Cohesion: 0.22
Nodes (4): { chromium }, fs, OUT, path

### Community 31 - "ezoic-signup.js"
Cohesion: 0.25
Nodes (7): { chromium }, clickFirst(), fs, OUT, PASS_FILE, path, sleep()

### Community 32 - "ads.js"
Cohesion: 0.46
Nodes (7): boot(), ensureLabel(), fillPlaceholders(), loadAdSense(), markEmpty(), markFilled(), watchFill()

### Community 33 - "porkbun-create-account.js"
Cohesion: 0.25
Nodes (5): { chromium }, crypto, fs, OUT, path

### Community 34 - "playwright"
Cohesion: 0.25
Nodes (6): playwright, { chromium }, fs, OUT, path, { chromium }

### Community 35 - "adsense-push-ads-now.js"
Cohesion: 0.29
Nodes (6): { chromium }, clickFirst(), fs, OUT, path, sleep()

### Community 36 - "ezoic-export-snippet.js"
Cohesion: 0.25
Nodes (5): { chromium }, fs, OUT, path, SNIP

### Community 37 - "ezoic-setup.js"
Cohesion: 0.25
Nodes (5): { chromium }, fs, OUT, PASS_FILE, path

### Community 38 - "contact.js"
Cohesion: 0.52
Nodes (6): escapeHtml(), json(), LIMITS, oneLine(), onRequestPost(), sendEmail()

### Community 40 - "adsense-gapfix-status.js"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 41 - "adsense-onboard.js"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 42 - "adsense-remove-unused-sites.js"
Cohesion: 0.29
Nodes (5): { chromium }, fs, OUT, path, TARGETS

### Community 43 - "adsense-retry-tld.js"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 44 - "adsense-start.js"
Cohesion: 0.33
Nodes (6): { chromium }, fs, main(), OUT, path, shot()

### Community 45 - "complete-adsense.js"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 46 - "ezoic-capture-v2.js"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 47 - "ezoic-connect.js"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 48 - "ezoic-fill.js"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 49 - "ezoic-robust.js"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 51 - "adsense-accept.js"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 52 - "adsense-verify.js"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 53 - "buy-domain.js"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 54 - "buy-domain-checkout.js"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 55 - "buy-domain-finish.js"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 56 - "extract-adsense-snippets.js"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 57 - "map-loansflow.js"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 58 - "offers.js"
Cohesion: 0.83
Nodes (3): ensureStyle(), mount(), run()

### Community 59 - "graft skill (ask, grep, skeleton, callers, map)"
Cohesion: 0.67
Nodes (3): Graft repo context graph, graft skill (agents copy), graft skill (ask, grep, skeleton, callers, map)

## Knowledge Gaps
- **37 isolated node(s):** `graft`, `checklist.js (progress and download script)`, `ads.js AdSense slot loader`, `Sources and Uses of Funds table`, `Calculator Step 7: Mortgage Affordability` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 350 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `playwright` to `AdSense Check Scripts`, `Tools Wizard Engine (app.js)`, `Ad and Affiliate Signup Automation`, `adsense-finish-verify.js`, `adsense-strict-verify-host.js`, `browser/package.json`, `ref_fs`, `ref_path`, `adsense-go-live.js`, `ezoic-join.js`, `adsense-add-loan-domain.js`, `adsense-go-now.js`, `ezoic-capture-snippet.js`, `ezoic-signup.js`, `porkbun-create-account.js`, `adsense-push-ads-now.js`, `ezoic-export-snippet.js`, `ezoic-setup.js`, `adsense-gapfix-status.js`, `adsense-onboard.js`, `adsense-remove-unused-sites.js`, `adsense-retry-tld.js`, `adsense-start.js`, `complete-adsense.js`, `ezoic-capture-v2.js`, `ezoic-connect.js`, `ezoic-fill.js`, `ezoic-robust.js`, `adsense-accept.js`, `adsense-verify.js`, `buy-domain.js`, `buy-domain-checkout.js`, `buy-domain-finish.js`, `extract-adsense-snippets.js`, `map-loansflow.js`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `graft`, `checklist.js (progress and download script)`, `ads.js AdSense slot loader` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Guides and Calculator Help` be split into smaller, more focused modules?**
  _Cohesion score 0.05081081081081081 - nodes in this community are weakly interconnected._
- **Should `Ad and Affiliate Legal Terms` be split into smaller, more focused modules?**
  _Cohesion score 0.07575757575757576 - nodes in this community are weakly interconnected._
- **Should `Browser Automation Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.08305647840531562 - nodes in this community are weakly interconnected._
- **Should `Site Architecture and Ops Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.07017543859649122 - nodes in this community are weakly interconnected._
- **Should `Tools Wizard Engine (app.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.08262108262108261 - nodes in this community are weakly interconnected._
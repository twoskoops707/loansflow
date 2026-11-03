# Graph Report - site-redesign  (2026-10-22)

## Corpus Check
- 129 files · ~182,497 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 5, .css 3, .ico 1)

## Summary
- 841 nodes · 1444 edges · 64 communities (60 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

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
- Wizard Rendering Helpers
- Homepage Quick Estimate (home.js)
- JSON-LD Verification
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63

## God Nodes (most connected - your core abstractions)
1. `playwright` - 40 edges
2. `fmtMoney()` - 25 edges
3. `render()` - 21 edges
4. `monthlyPI()` - 15 edges
5. `LF` - 15 edges
6. `LoansFlow homepage` - 15 edges
7. `Guides Index` - 15 edges
8. `Calculator Help: Using Every LoansFlow Tool` - 14 edges
9. `printSectionTitle()` - 13 edges
10. `How our numbers work (methodology)` - 13 edges

## Surprising Connections (you probably didn't know these)
- `graft skill (ask, grep, skeleton, callers, map)` --semantically_similar_to--> `graft skill (agents copy)`  [INFERRED] [semantically similar]
  .claude/skills/graft/SKILL.md → .agents/skills/graft/SKILL.md
- `Graft repo context graph` --references--> `graft skill (ask, grep, skeleton, callers, map)`  [INFERRED]
  AGENTS.md → .claude/skills/graft/SKILL.md
- `Design Directions drafts page` --conceptually_related_to--> `Visual direction (midnight ink, brass, Syne/Manrope)`  [INFERRED]
  public/drafts.html → docs/superpowers/specs/2026-07-29-loansflow-design.md
- `Static multi-page plus tools SPA architecture` --references--> `ads.txt (AdSense pub-6588738221262894)`  [EXTRACTED]
  docs/superpowers/specs/2026-07-29-loansflow-design.md → public/ads.txt
- `LoansFlow static Cloudflare Pages site` --references--> `Original standalone mortgage calculator suite`  [EXTRACTED]
  CLAUDE.md → docs/source-mortgage-calculator.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Deployment pipeline for loansflow.loan** — github_workflows_deploy_pages_deploy, github_workflows_github_pages_deploy, cloudflare_pages_loansflow_live, docs_domain_loansflow_loan [EXTRACTED 1.00]
- **Market news live API with static fallback refresh** — claude_md_market_news_function, claude_md_market_news_snapshot, github_workflows_refresh_market_news_refresh, tools_news_refresh_market_news [EXTRACTED 1.00]
- **AdSense plus affiliate monetization** — claude_md_public_js_ads, claude_md_public_js_offers, docs_ads_adsense_unit_map, docs_monetize_hold_policy, readme_ads_txt [INFERRED 0.85]
- **LoansFlow site legal/trust pages** — public_privacy, public_terms, public_disclaimer, public_about, public_contact, public_methodology [INFERRED 0.85]
- **Monetization documents** — docs_legal_rate_card, docs_legal_publisher_terms_short_form, public_ads, docs_superpowers_specs_2026_07_29_loansflow_design_monetization_path [INFERRED 0.85]
- **Calculators sharing the monthly payment formula** — public_methodology_mortgage_payment, public_methodology_refinance_comparison, public_methodology_affordability, public_methodology_dscr [EXTRACTED 1.00]
- **SBA program guides (7a, 504, Express/Microloans/CAPLines, Eligibility)** — public_guides_sba_7a_step_by_step, public_guides_sba_504, public_guides_sba_express_microloans_caplines, public_guides_sba_loan_eligibility [INFERRED 0.85]
- **Loan document preparation cluster** — public_guides_loan_documents, public_guides_checklist, public_guides_business_plan_for_a_loan, public_guides_loan_documents_sba_forms [INFERRED 0.85]
- **Mortgage calculator step flow (Steps 3-7)** — public_guides_calculator_help_step3_mortgage_details, public_guides_calculator_help_step4_payment_breakdown, public_guides_calculator_help_step5_amortization_ledger, public_guides_calculator_help_step6_refinance, public_guides_calculator_help_step7_affordability [EXTRACTED 0.95]

## Communities (64 total, 4 thin omitted)

### Community 0 - "Guides and Calculator Help"
Cohesion: 0.05
Nodes (74): Business Plan and Projections Lenders Want to See, Financial Projections with Stated Assumptions, Sources and Uses of Funds table, Calculator Help: Using Every LoansFlow Tool, Calculator Step 0: SBA and Commercial Loan, Calculator Step 1: Commercial Amortization, Calculator Step 2: Line of Credit, Calculator Step 3: Mortgage Loan Details (+66 more)

### Community 1 - "Ad and Affiliate Legal Terms"
Cohesion: 0.07
Nodes (39): LoansFlow Publisher Terms (Short-Form), FTC Endorsement Guides disclosures, LoansFlow Media / Affiliate Rate Card (placeholder), Affiliate performance models (CPL/CPA/rev share), Direct display ad units (CPM placeholders), LoansFlow Logo Options, Brand palette (ink #071018, teal #1a8f7c, brass #c9a45c), Logo Option D (editorial hybrid, shipped) (+31 more)

### Community 2 - "Browser Automation Utilities"
Cohesion: 0.08
Nodes (11): decrypt(), get_key(), main(), decrypt(), decrypt(), api(), gql(), main() (+3 more)

### Community 3 - "Site Architecture and Ops Docs"
Cohesion: 0.07
Nodes (35): LoansFlow static Cloudflare Pages site, functions/api/market-news.js Pages Function, public/data/market-news.json static fallback, public/js/ads.js AdSense slot loader, public/js/app.js calculator wizard, public/js/home.js homepage quick-estimate, public/js/offers.js affiliate renderer, Legacy Pages project loansflow (loansflow.pages.dev) (+27 more)

### Community 4 - "AdSense Check Scripts"
Cohesion: 0.06
Nodes (32): { chromium }, fs, https, OUT, path, TAG, checkPlaced(), { chromium } (+24 more)

### Community 5 - "Tools Wizard Engine (app.js)"
Cohesion: 0.08
Nodes (32): applyIntroDetails(), attachIntroHandlers(), copyShareLink(), estimateSbaGuarantyFee(), fetchMarketNewsPayload(), introChoice(), introChoiceSelect(), introIncomeField() (+24 more)

### Community 6 - "Graft Hooks"
Cohesion: 0.12
Nodes (20): best(), entry(), { execFileSync }, fromPkg(), fs, globalRoot(), newer(), path (+12 more)

### Community 7 - "Embeddable Calculators (lf-calc)"
Cohesion: 0.16
Nodes (6): fieldHtml(), mount(), draw(), read(), start(), LF

### Community 8 - "Mortgage and Amortization Math"
Cohesion: 0.30
Nodes (21): affordMetrics(), buildAmortization(), monthlyPI(), printDailyInterest(), printMortgageResults(), printMortgageSchedule(), printReportShell(), printRow() (+13 more)

### Community 9 - "Market News Refresh Pipeline"
Cohesion: 0.17
Nodes (16): refresh-market-news workflow (daily cron), articleFromItem(), buildPayload(), cleanSummary(), decodeXml(), deltaLabel(), __dirname, FEEDS (+8 more)

### Community 10 - "Ad and Affiliate Signup Automation"
Cohesion: 0.21
Nodes (18): applyAdSense(), applyAmazonAssociates(), applyEzoic(), applyMediavine(), { chromium }, ensureChrome(), fs, googleLogin() (+10 more)

### Community 11 - "Wizard Rendering Helpers"
Cohesion: 0.20
Nodes (19): adInContent(), fmt(), fmtMoney(), render(), renderBalanceChart(), renderFooter(), renderNav(), renderPaymentMixChart() (+11 more)

### Community 12 - "Homepage Quick Estimate (home.js)"
Cohesion: 0.21
Nodes (16): escapeHtml(), estimateState(), firstFixedRatePct(), fmt(), fmtMoney(), initEstimate(), loadRates(), marketNewsUrlCandidates() (+8 more)

### Community 13 - "JSON-LD Verification"
Cohesion: 0.11
Nodes (16): allDefined, allFiles, collectIds(), collectRefs(), everyId, files, FORBIDDEN, fs (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (13): addSiteIfMissing(), { chromium }, dump(), ensureSession(), fs, https, OUT, path (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.27
Nodes (14): articleFromItem(), buildPayload(), cleanSummary(), decodeXml(), deltaLabel(), FEEDS, fetchText(), fmtPct() (+6 more)

### Community 16 - "Community 16"
Cohesion: 0.23
Nodes (13): checkPlaced(), { chromium }, clickVerify(), dump(), fetchText(), fs, https, OUT (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): description, engines, node, name, private, scripts, deploy, dev (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): author, dependencies, playwright, description, keywords, license, main, name (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.35
Nodes (11): buildChecklistText(), CHECKLIST_DATA, countAllItems(), countChecked(), handleDownload(), handleReset(), init(), loadState() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.42
Nodes (10): esc(), loadData(), matches(), render(), renderItem(), renderLenderCard(), renderNationalCard(), renderPartnerCard() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (8): { chromium }, fs, OUT, path, { chromium }, fs, OUT, path

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (8): { chromium }, fs, OUT, path, { chromium }, fs, OUT, path

### Community 23 - "Community 23"
Cohesion: 0.31
Nodes (10): amortizationYearRows(), attachHandlers(), downloadCsv(), exportBizAmortCsv(), exportLocCsv(), exportMortgageAmortCsv(), openReportOptions(), printCurrentReport() (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (7): { chromium }, fs, loginIfNeeded(), OUT, PASS, path, sleep()

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (7): { chromium }, clickText(), fs, OUT, PASS_FILE, path, sleep()

### Community 26 - "Community 26"
Cohesion: 0.31
Nodes (9): adInArticle(), applyLiveRates(), ensureMarketNewsLoaded(), escapeHtml(), formatNewsUpdatedLabel(), renderNewsCards(), renderRateStrip(), renderStep6() (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.28
Nodes (9): clearPinnedScenarios(), deletePinnedScenario(), loadPinnedScenario(), openCompareModal(), pinCurrentScenario(), renderCompareModal(), renderCompareTable(), savePinnedScenarios() (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (4): { chromium }, fs, OUT, path

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (7): { chromium }, fs, loginIfNeeded(), OUT, PASS, path, sleep()

### Community 30 - "Community 30"
Cohesion: 0.22
Nodes (4): { chromium }, fs, OUT, path

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (7): { chromium }, clickFirst(), fs, OUT, PASS_FILE, path, sleep()

### Community 32 - "Community 32"
Cohesion: 0.46
Nodes (7): boot(), ensureLabel(), fillPlaceholders(), loadAdSense(), markEmpty(), markFilled(), watchFill()

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (5): { chromium }, crypto, fs, OUT, path

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (6): playwright, { chromium }, fs, OUT, path, { chromium }

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (6): { chromium }, clickFirst(), fs, OUT, path, sleep()

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (5): { chromium }, fs, OUT, path, SNIP

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (5): { chromium }, fs, OUT, PASS_FILE, path

### Community 38 - "Community 38"
Cohesion: 0.52
Nodes (6): escapeHtml(), json(), LIMITS, oneLine(), onRequestPost(), sendEmail()

### Community 39 - "Community 39"
Cohesion: 0.38
Nodes (7): buildLocSchedule(), businessMetrics(), locMetrics(), mortgageMetrics(), renderWorkflowBar(), scenarioStats(), snapshotStats()

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (5): { chromium }, fs, OUT, path, TARGETS

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (6): { chromium }, fs, main(), OUT, path, shot()

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (4): { chromium }, fs, OUT, path

### Community 50 - "Community 50"
Cohesion: 0.40
Nodes (6): dailyInterestHtml(), groupSchedule(), printTable(), scheduleTableHtml(), scheduleViewerBody(), wireScheduleViewer()

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 52 - "Community 52"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 56 - "Community 56"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 57 - "Community 57"
Cohesion: 0.33
Nodes (4): { chromium }, fs, OUT, path

### Community 58 - "Community 58"
Cohesion: 0.83
Nodes (3): ensureStyle(), mount(), run()

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (3): Graft repo context graph, graft skill (agents copy), graft skill (ask, grep, skeleton, callers, map)

## Knowledge Gaps
- **38 isolated node(s):** `graft`, `Graft repo context graph`, `graft skill (agents copy)`, `website-design skill`, `Refero Styles design-system library` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 358 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `Community 34` to `AdSense Check Scripts`, `Ad and Affiliate Signup Automation`, `Community 14`, `Community 16`, `Community 18`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 33`, `Community 35`, `Community 36`, `Community 37`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `render()` (e.g. with `renderStep0()` and `renderStep1()`) actually correct?**
  _`render()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `graft`, `Graft repo context graph`, `graft skill (agents copy)` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Guides and Calculator Help` be split into smaller, more focused modules?**
  _Cohesion score 0.05081081081081081 - nodes in this community are weakly interconnected._
- **Should `Ad and Affiliate Legal Terms` be split into smaller, more focused modules?**
  _Cohesion score 0.07439613526570048 - nodes in this community are weakly interconnected._
- **Should `Browser Automation Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.08305647840531562 - nodes in this community are weakly interconnected._
- **Should `Site Architecture and Ops Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.06794871794871794 - nodes in this community are weakly interconnected._
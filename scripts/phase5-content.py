#!/usr/bin/env python3
"""Phase 5: CPA guide stubs, comparison hub, AEO answer blocks, llms.txt, subscribe mount. Idempotent."""
import re, json, pathlib, html as H
PUB = pathlib.Path(__file__).resolve().parent.parent / 'public'
SITE = 'https://loansflow.loan'
PERSON_ID = SITE + '/author.html#person'
TEMPLATE = (PUB / 'guides/dscr-explained.html').read_text()
BOX = re.search(r'<section class="author-box">[\s\S]*?</section>', TEMPLATE).group(0)
PERSON = json.loads(re.search(r'<script type="application/ld\+json">\s*(\{[^<]*"@type": "Person"[^<]*\})\s*</script>', TEMPLATE).group(1))
def ld(o): return '<script type="application/ld+json">\n' + json.dumps(o, indent=2, ensure_ascii=False) + '\n</script>'
def A(u, t): return f'<a href="{u}" target="_blank" rel="noopener noreferrer">{t}</a>'
SUB = '<div data-lf-subscribe></div>'
NOW = '2026-11-11'; NOWTXT = 'November 11, 2026'

def make(path, title, desc, h1, answer, body, faq=None, noindex=False, crumbs=None):
    url = f'{SITE}/{path[:-5]}' if not path.endswith('/index.html') else f'{SITE}/{path[:-10]}/'
    h = TEMPLATE
    h = re.sub(r'<script type="application/ld\+json">[\s\S]*?</script>\s*', '', h)
    h = re.sub(r'<title>.*?</title>', f'<title>{H.escape(title)} | LoansFlow</title>', h, flags=re.S)
    h = re.sub(r'(<meta name="description" content=")[^"]*"', lambda m: m.group(1) + H.escape(desc, quote=True) + '"', h)
    h = re.sub(r'(<link rel="canonical" href=")[^"]*"', lambda m: m.group(1) + url + '"', h)
    h = re.sub(r'(<meta property="og:title" content=")[^"]*"', lambda m: m.group(1) + H.escape(title, quote=True) + ' | LoansFlow"', h)
    h = re.sub(r'(<meta property="og:description" content=")[^"]*"', lambda m: m.group(1) + H.escape(desc, quote=True) + '"', h)
    h = re.sub(r'(<meta property="og:url" content=")[^"]*"', lambda m: m.group(1) + url + '"', h)
    robots = 'noindex, follow' if noindex else 'index, follow'
    if re.search(r'<meta name="robots"', h): h = re.sub(r'<meta name="robots" content="[^"]*">', f'<meta name="robots" content="{robots}">', h)
    else: h = h.replace('</title>', f'</title>\n  <meta name="robots" content="{robots}">', 1)
    h = h.replace(' aria-current="page"', '')
    blocks = [PERSON,
      {'@context': 'https://schema.org', '@type': 'Article', 'headline': H.unescape(h1), 'description': desc, 'mainEntityOfPage': url, 'dateModified': NOW,
       'author': {'@id': PERSON_ID}, 'publisher': {'@type': 'Organization', 'name': 'LoansFlow', 'url': SITE + '/'}}]
    if faq: blocks.append({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': H.unescape(a)}} for q, a in faq]})
    h = h.replace('</head>', '\n'.join(ld(b) for b in blocks) + '\n</head>')
    ans = f'<div class="lf-answer"><strong>Short answer:</strong> {answer}</div>\n    ' if answer else ''
    faqhtml = ''
    if faq: faqhtml = '<h2>Common questions</h2>\n    <div class="lf-faq">' + ''.join(f'<details><summary>{H.escape(q)}</summary><p>{a}</p></details>' for q, a in faq) + '</div>\n    '
    main = (f'<main class="legal-page">\n    <p class="updated">Updated {NOWTXT} &middot; By Joshua Miller, CPA</p>\n    <h1>{h1}</h1>\n    {ans}{body}\n    {faqhtml}{SUB}\n    {BOX}\n  </main>')
    a = h.index('<main'); b = h.index('</main>') + 7
    h = h[:a] + main + h[b:]
    h = h.replace('<script src="/js/lf-calc.js', '<script src="/js/lf-calc.js') 
    if '/js/subscribe.js' not in h: h = h.replace('</body>', '  <script src="/js/subscribe.js" defer></script>\n</body>')
    out = PUB / path; out.parent.mkdir(exist_ok=True); out.write_text(h); print('wrote', path)

# ---------------- CPA guides (stubs: accurate, intentionally concise; noindex until reviewed) ----------------
make('guides/sba-loan-interest-tax-treatment.html', 'Tax Treatment of SBA Loan Interest and Fees',
  'How interest and fees on an SBA loan are generally treated for federal income tax: deductibility, the 163(j) limit, capitalized fees and what to track.',
  'Tax Treatment of SBA Loan Interest and Fees',
  'Interest on an SBA loan used for business purposes is generally deductible as a business expense, subject to limits; loan principal is not deductible, and the SBA guarantee fee and other closing costs are generally spread over the life of the loan rather than deducted all at once. Confirm your situation with your own CPA.',
  f'''<h2>Interest is generally deductible, with limits</h2>
    <p>Interest paid on a loan used for your trade or business is generally a deductible business expense. The loan proceeds themselves are not income, and repaying principal is not deductible. {A('https://www.irs.gov/publications/p535','IRS Publication 535, Business Expenses')} covers business interest.</p>
    <h2>The business interest limitation (Section 163(j))</h2>
    <p>Larger businesses can face a cap on deductible business interest. Many small businesses are exempt based on average annual gross receipts, and the threshold is adjusted for inflation each year, so check the current figure in the instructions for {A('https://www.irs.gov/forms-pubs/about-form-8990','Form 8990')}.</p>
    <h2>The guarantee fee and closing costs</h2>
    <p>The SBA upfront guarantee fee, lender fees and other costs of obtaining the loan are generally treated as debt issuance costs and deducted over the term of the loan, not in the year paid. If you finance the fee into the loan, it still follows that treatment. See the <a href="/loans/sba-7a#worked-example">$350,000 worked example</a> for how large these costs can be.</p>
    <h2>Mixed-use proceeds and tracing</h2>
    <p>Interest is generally classified by how the loan proceeds are spent. If part of a loan funds personal use or a non-deductible purpose, the interest on that part may not be deductible. Keep clear records of where proceeds go, and keep business and personal funds separate.</p>
    <h2>S corporations and other pass-throughs</h2>
    <p>Whether a loan sits in the entity or with the owner affects where interest is reported and how basis is computed. Work through the structure with your CPA before closing, not after. In a multi-state business, state rules on interest deductions can differ from federal rules.</p>
    <h2>What to track</h2>
    <ul><li>The closing statement showing every fee, and which were financed</li><li>An annual interest statement from the lender</li><li>The use of proceeds, by date and amount</li><li>The amortization schedule, so fee amortization and interest are posted correctly (use the <a href="/calculators/sba-7a">SBA 7(a) calculator</a>)</li></ul>
    <p class="lf-disclaimer">General information, not tax advice. Tax rules change and depend on your facts; consult a CPA or tax professional. Related: <a href="/guides/dscr-cpa-view">DSCR from a CPA&rsquo;s view</a>, <a href="/guides/sba-7a-step-by-step">SBA 7(a) step by step</a>.</p>''',
  faq=[('Is SBA loan interest tax deductible?', 'Interest on a loan used for business purposes is generally deductible, subject to limits such as Section 163(j). Confirm with your CPA.'),
       ('Can I deduct the SBA guarantee fee in the year I pay it?', 'Generally no. It is usually treated as a debt issuance cost and deducted over the life of the loan.')], noindex=True)

make('guides/owner-add-backs-ebitda.html', 'Owner Add-Backs and EBITDA Normalization',
  'How lenders and buyers adjust a small business income statement: EBITDA, seller discretionary earnings, common add-backs and what documentation lenders expect.',
  'Owner Add-Backs and EBITDA Normalization',
  'Normalization adjusts reported profit for items that are not part of ongoing operations, such as owner pay above market, personal expenses, one-time costs, interest, depreciation and taxes, to show what a new owner or lender can expect the business to earn. Each add-back needs documentation that ties to the tax returns and books.',
  '''<h2>EBITDA and SDE</h2>
    <p><strong>EBITDA</strong> is earnings before interest, taxes, depreciation and amortization. For owner-operated businesses, buyers and brokers often use <strong>seller&rsquo;s discretionary earnings (SDE)</strong>, which also adds back one owner&rsquo;s compensation and benefits. The <a href="/calculators/business-acquisition">business acquisition calculator</a> uses SDE minus a market salary for the operator, because a lender will want the new owner paid.</p>
    <h2>Common add-backs</h2>
    <ul><li>Owner compensation above what it would cost to hire a manager (S corporations: compare officer wages to reasonable compensation)</li><li>Personal expenses run through the business, such as vehicles, travel and family members not working in the business</li><li>One-time or non-recurring costs, such as a lawsuit settlement or a move</li><li>Non-cash items such as depreciation and amortization, and interest</li><li>Above- or below-market rent paid to an owner-related landlord, restated to market</li></ul>
    <h2>What lenders accept</h2>
    <p>Lenders start from the filed tax returns and financial statements. An add-back that cannot be tied to a return, invoice or bank record is often rejected. Aggressive add-backs raise the reported earnings and the price, but they also lower credibility; a valuation and the lender&rsquo;s own cash-flow analysis decide what counts. See <a href="/guides/dscr-cpa-view">DSCR from a CPA&rsquo;s view</a> for how the adjusted number feeds the coverage test.</p>
    <h2>Multi-state and pass-through issues</h2>
    <p>For multi-state operators, confirm that payroll and state taxes are consistent across entities before adding anything back. For S corporations, reasonable-compensation rules and shareholder distributions affect what the &ldquo;owner pay&rdquo; adjustment should be.</p>
    <p class="lf-disclaimer">General information, not valuation, tax or legal advice. Related: <a href="/loans/sba-7a">SBA 7(a) loan</a>, <a href="/calculators/cash-to-close">cash-to-close estimator</a>.</p>''',
  faq=[('What is the difference between EBITDA and SDE?', 'EBITDA excludes interest, taxes, depreciation and amortization; SDE also adds back one owner&rsquo;s pay and benefits, and is common for owner-operated businesses.'),
       ('Do lenders accept all add-backs?', 'No. Lenders generally accept adjustments they can tie to tax returns, financial statements and other documents.')], noindex=True)

make('guides/dscr-cpa-view.html', 'DSCR From a CPA\'s View',
  'How a CPA reads debt service coverage: which earnings number to use, owner pay, taxes for pass-through owners, global versus business DSCR, and common mistakes.',
  'DSCR From a CPA&rsquo;s View',
  'DSCR is cash flow available for debt service divided by annual principal and interest payments; many lenders look for at least 1.25x, but the answer depends on which earnings number you use, how owner pay and taxes are treated, and whether the lender tests the business alone or all of your obligations together.',
  '''<h2>Pick the numerator carefully</h2>
    <p>Business DSCR commonly uses net income plus interest, depreciation and amortization (and other non-cash items), then subtracts owner compensation that the business must pay. A number built from normalized earnings (see <a href="/guides/owner-add-backs-ebitda">owner add-backs</a>) can differ from one built from raw tax-return income.</p>
    <h2>Owner pay and taxes</h2>
    <p>For pass-through entities, the owner&rsquo;s income tax on business profit is paid personally, so conservative lenders look at after-tax cash flow or a global view. For S corporations, reasonable compensation must be paid before distributions.</p>
    <h2>Global DSCR</h2>
    <p>Some lenders combine business cash flow with the owners&rsquo; personal income and add personal debt payments to the denominator. Gather personal tax returns and a debt schedule early.</p>
    <h2>A short example</h2>
    <p>On the <a href="/loans/sba-7a#worked-example">$350,000 SBA 7(a) example</a>, annual debt service is about $55,503, so net operating income of about $69,400 gives a DSCR of 1.25x, and $85,000 gives about 1.53x. Use the <a href="/calculators/dscr">DSCR calculator</a> to test your own numbers, and read the general <a href="/guides/dscr-explained">DSCR explainer</a>.</p>
    <h2>Common mistakes</h2>
    <ul><li>Using EBITDA while ignoring taxes the owner must pay</li><li>Forgetting existing debt payments, including equipment leases and owner loans</li><li>Using projected rather than historical cash flow without support</li><li>Ignoring seasonality, so a strong year hides a weak quarter</li></ul>
    <p class="lf-disclaimer">General information, not tax or financial advice. Lender minimums differ.</p>''',
  faq=[('What DSCR do lenders want?', 'Many look for at least 1.25x, but each lender sets its own minimum and method.'),
       ('What is global DSCR?', 'A coverage ratio that combines business and personal cash flow and debt payments of the owners.')], noindex=True)

# ---------------- comparison hub + spokes ----------------
INFO = 'https://www.sba.gov/document/information-notice-5000-881797-fy-2027-7a-program-fees'
INFO504 = 'https://www.sba.gov/document/information-notice-5000-881796-fy-2027-504-program-fees'
TERMS = 'https://www.sba.gov/partners/lenders/7a-loan-program/terms-conditions-eligibility'
def table(rows, h):
    return '<div style="overflow-x:auto"><table class="lf-table"><thead><tr>' + ''.join(f'<th>{x}</th>' for x in h) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows) + '</tbody></table></div>'
FOOT = '<p class="lf-disclaimer">General information as of November 2026, not financial, tax or legal advice. LoansFlow is not a lender. Program rules and fees change; confirm with your lender and the SBA.</p>'

make('compare/sba-7a-vs-504.html', 'SBA 7(a) vs 504 Loan: Which Fits Your Project?',
  'Compare SBA 7(a) and 504 loans side by side: size, terms, structure, rates, fees, down payment and what each is best for.',
  'SBA 7(a) vs 504 Loan: Which Fits Your Project?',
  'Choose a 7(a) for flexibility, such as working capital, equipment, buying a business or refinancing; choose a 504 for owner-occupied real estate or long-life equipment, where a fixed rate on the CDC portion and a lower down payment can lower long-term cost.',
  table([
    ['Typical use', 'Working capital, equipment, real estate, buying a business, refinancing', 'Owner-occupied buildings, construction, long-life equipment; not working capital'],
    ['Size', 'Up to $5 million', f'SBA debenture generally up to $5 million; up to $5.5 million for qualifying manufacturers and energy projects ({A(INFO504,"SBA Notice 5000-881796")})'],
    ['Structure', 'One loan from one lender, SBA guarantees part', 'About 50% bank, up to 40% CDC (SBA-backed), 10% or more from you'],
    ['Term', 'Up to 10 years; up to 25 for real estate', '10 years (equipment); 20 or 25 years (real estate)'],
    ['Rate', f'Negotiated, capped by SBA, often variable ({A(TERMS,"SBA terms")})', 'Fixed on the CDC portion; bank portion set by the lender'],
    ['SBA fees (FY 2027)', f'2% to 3.75% of the guaranteed portion ({A(INFO,"Notice 5000-881797")})', '0.50% upfront and 0.203% annual on the debenture'],
  ], ['', 'SBA 7(a)', 'SBA 504']) + f'''
    <h2>How to decide</h2>
    <ul><li>Need working capital, inventory or to buy a business? Look at the <a href="/loans/sba-7a">7(a)</a>.</li><li>Buying or building the building you operate from? Price a <a href="/loans/sba-504">504</a> too.</li><li>Run both through the <a href="/calculators/sba-7a">7(a) calculator</a> and <a href="/calculators/sba-504">504 calculator</a> before you talk to a lender.</li></ul>
    <p>Related: <a href="/compare/sba-vs-conventional-term-loan">SBA vs conventional term loan</a>, <a href="/compare/">all comparisons</a>.</p>
    {FOOT}''',
  faq=[('Is a 504 loan cheaper than a 7(a)?', 'It can be for real estate because of the fixed CDC rate and lower down payment, but fees, rates and your project decide; compare both with a lender.'),
       ('Can I use a 504 for working capital?', 'No. A 504 is for fixed assets such as real estate and long-life equipment.')])

make('compare/sba-vs-conventional-term-loan.html', 'SBA Loan vs Conventional Term Loan',
  'Compare an SBA-guaranteed loan with a conventional bank term loan: qualification, down payment, terms, speed and cost.',
  'SBA Loan vs Conventional Term Loan',
  'An SBA loan is a bank loan partly guaranteed by the SBA, which can let a lender approve borrowers and terms it would not offer conventionally; a conventional term loan has no SBA guarantee, so strong borrowers may get faster approval and no SBA fee, while others face higher down payments or shorter terms.',
  table([
    ['Government guarantee', 'Yes, on part of the loan', 'No'],
    ['Loan size', 'Up to $5 million for 7(a)', 'Set by the lender; no SBA cap'],
    ['Term', 'Up to 10 years; up to 25 for real estate (7(a))', 'Commonly 3 to 10 years, often amortized over 20 to 25 for real estate with a balloon'],
    ['Down payment', 'Equity injection varies; 10% minimum for a business purchase', 'Commonly 20% to 30% on commercial real estate'],
    ['Fees', f'SBA guarantee fee, 2% to 3.75% of the guaranteed portion ({A(INFO,"FY 2027 notice")})', 'Lender fees only; no SBA fee'],
    ['Best for', 'Borrowers who fall just short of conventional standards, or who need longer terms', 'Strong borrowers, larger deals, speed'],
  ], ['', 'SBA loan', 'Conventional term loan']) + f'''
    <p>Pages: <a href="/loans/sba-7a">SBA 7(a)</a>, <a href="/loans/commercial-term-loan">commercial term loan</a>. Related: <a href="/compare/sba-7a-vs-504">7(a) vs 504</a>, <a href="/compare/sba-vs-online-lender">SBA vs online lender</a>.</p>
    {FOOT}''',
  faq=[('Do I need to be turned down by a bank to get an SBA loan?', 'SBA rules require that credit is not otherwise available on reasonable terms; ask your lender how it applies to you.'),
       ('Which is faster?', 'Conventional loans can be faster for strong borrowers, but timing depends on the lender and the file.')])

make('compare/sba-vs-online-lender.html', 'SBA Loan vs Online Lender',
  'Compare SBA loans with online business lenders: speed, cost, terms, qualification and what to check before you borrow.',
  'SBA Loan vs Online Lender',
  'Online lenders usually decide faster and ask for less paperwork, but their financing often costs more and has shorter terms than an SBA loan; compare total cost and the annual percentage rate, not just the monthly payment or a factor rate.',
  table([
    ['Speed', 'Weeks, depending on the lender and the file', 'Often days'],
    ['Paperwork', 'Tax returns, financial statements, debt schedule, plan', 'Usually bank statements and basic financials'],
    ['Terms', 'Up to 10 years; up to 25 for real estate (7(a))', 'Often shorter, with more frequent payments'],
    ['Cost', f'Rate capped by SBA rules; fee is a percentage of the guaranteed portion ({A(INFO,"FY 2027")})', 'Often higher; may be quoted as a factor rate, so convert to an APR to compare'],
    ['Best for', 'Larger, longer-term needs where cost matters', 'Short-term needs or borrowers who cannot yet qualify for bank or SBA credit'],
  ], ['', 'SBA loan', 'Online lender']) + f'''
    <p>Check the total repayment, the APR, prepayment terms and whether payments are daily or weekly. Run numbers in the <a href="/calculators/loan-payment">loan payment calculator</a>, then read <a href="/guides/choosing-lender">how to choose a lender</a>. Related: <a href="/compare/sba-vs-conventional-term-loan">SBA vs conventional</a>, <a href="/loans/sba-7a">SBA 7(a)</a>.</p>
    {FOOT}''',
  faq=[('Are online business loans always more expensive?', 'Not always, but they often cost more than SBA loans. Compare total repayment and APR.'),
       ('What is a factor rate?', 'A multiplier applied to the amount borrowed to set total repayment. It is not an APR, so convert before comparing.')])

make('compare/index.html', 'Compare Business Loans: SBA 7(a), 504, Conventional and Online',
  'Side-by-side comparisons of SBA 7(a), SBA 504, conventional term loans and online lenders.',
  'Compare Business Loans',
  'Use these side-by-side comparisons to narrow your choice: SBA 7(a) vs 504 for fixed assets versus flexibility, SBA vs conventional for qualification and cost, and SBA vs online lender for speed versus price.',
  '''<ul>
      <li><a href="/compare/sba-7a-vs-504"><strong>SBA 7(a) vs 504</strong></a>: flexibility versus owner-occupied real estate and equipment.</li>
      <li><a href="/compare/sba-vs-conventional-term-loan"><strong>SBA vs conventional term loan</strong></a>: qualification, down payment and fees.</li>
      <li><a href="/compare/sba-vs-online-lender"><strong>SBA vs online lender</strong></a>: speed versus total cost.</li>
    </ul>
    <h2>The loan pages</h2>
    <p><a href="/loans/sba-7a">SBA 7(a)</a>, <a href="/loans/sba-504">SBA 504</a>, <a href="/loans/sba-express">SBA Express</a>, <a href="/loans/sba-microloan">SBA Microloan</a>, <a href="/loans/line-of-credit">line of credit</a>, <a href="/loans/commercial-term-loan">commercial term loan</a> and <a href="/loans/equipment-financing">equipment financing</a>.</p>''' + FOOT)

# ---------------- AEO answer blocks atop existing guides ----------------
ANS = {
 'dscr-explained': 'DSCR is net operating income divided by annual debt service; many commercial and SBA lenders look for at least 1.25x, meaning cash flow covers the payments with a 25% cushion.',
 'sba-7a-step-by-step': 'To apply for an SBA 7(a) loan, confirm eligibility, find a lender, gather documents (SBA Form 1919, personal financial statement, tax returns, financial statements, debt schedule and plan), submit for underwriting, receive approval, then close and fund.',
 'sba-504': 'An SBA 504 loan finances owner-occupied real estate and long-life equipment with about 50% from a bank, up to 40% from a CDC backed by the SBA, and 10% or more from you; the CDC portion has a fixed rate.',
 'sba-loan-eligibility': 'To qualify for an SBA loan, a business generally must be a for-profit U.S. business that meets SBA size standards, have owners who invest equity and sign a personal guarantee, and be unable to get credit elsewhere on reasonable terms.',
 'sba-express-microloans-caplines': 'SBA Express speeds up smaller loans through lender-approved processing, Microloans are small loans up to a limit made through nonprofit intermediaries, and CAPLines are revolving or short-term working-capital lines.',
 'term-loan-vs-line-of-credit': 'Use a term loan for a one-time purchase with a known cost, such as equipment or an acquisition, and a line of credit for recurring or uneven working-capital needs, since you pay interest only on what you draw.',
 'choosing-lender': 'Compare lenders on total cost (rate and fees), speed, SBA experience and communication, and ask for written fee estimates before you apply; a bank you already use, an SBA Preferred Lender or a broker are all options.',
 'loan-documents': 'Lenders generally ask for tax returns, financial statements, a debt schedule, identification, a personal financial statement and a business plan or projections; exact documents depend on the loan type.',
 'checklist': 'Gather three years of business and personal tax returns, current financial statements, a debt schedule, identification and entity documents before you apply; this checklist lists them by loan type.',
 'business-plan-for-a-loan': 'A lender-ready business plan explains what the business does, who the customers are, how the loan will be used and repaid, and includes financial projections with clear assumptions.',
 'mortgage-closing-costs': 'Mortgage closing costs are the lender, third-party and prepaid charges due at closing, and are commonly estimated as a percentage of the loan amount; your Loan Estimate lists them.',
 'refinance-break-even': 'Your refinance break-even point is the closing costs divided by the monthly savings; if you will keep the loan longer than that number of months, refinancing may pay off.',
}
for slug, text in ANS.items():
    p = PUB / f'guides/{slug}.html'; h = p.read_text()
    if 'class="lf-answer"' in h: continue
    h2 = re.sub(r'(<h1[^>]*>[\s\S]*?</h1>)', lambda m: m.group(1) + f'\n    <div class="lf-answer"><strong>Short answer:</strong> {text}</div>', h, count=1)
    if h2 != h: p.write_text(h2); print('answer', slug)

# ---------------- cross-links: loan pages, guides index, calculators index ----------------
for slug in ['sba-7a', 'sba-504', 'sba-express', 'sba-microloan', 'commercial-term-loan']:
    p = PUB / f'loans/{slug}.html'; h = p.read_text()
    if '/compare/' in h: continue
    h = h.replace('<h2 id="more">Keep reading</h2>\n    <ul>', '<h2 id="more">Keep reading</h2>\n    <ul><li><a href="/compare/">Compare SBA 7(a), 504, conventional and online loans</a></li>', 1)
    if slug in ('sba-7a', 'sba-504', 'sba-express', 'sba-microloan'): h = h.replace('<div class="lf-offers"', SUB + '\n    <div class="lf-offers"', 1)
    if '/js/subscribe.js' not in h: h = h.replace('</body>', '  <script src="/js/subscribe.js" defer></script>\n</body>')
    p.write_text(h)
print('crosslinks done')

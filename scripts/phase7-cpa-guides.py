#!/usr/bin/env python3
"""Phase 7: full-length CPA guides (supersedes the stubs in phase5-content.py). Run after phase5."""
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


IRSQA='https://www.irs.gov/newsroom/questions-and-answers-about-the-limitation-on-the-deduction-for-business-interest-expense'
make('guides/sba-loan-interest-tax-treatment.html', 'Tax Treatment of SBA Loan Interest and Fees',
  'How interest, the SBA guarantee fee and closing costs on an SBA loan are generally treated for federal income tax: the 163(j) limit, fee amortization, tracing, S corporations and what to track.',
  'Tax Treatment of SBA Loan Interest and Fees',
  'Interest on an SBA loan used for business purposes is generally deductible as a business expense, subject to limits such as Section 163(j). Loan principal is not deductible, and the SBA guarantee fee and other costs of getting the loan are generally deducted over the life of the loan rather than all in the year you pay them. Confirm your situation with your own CPA.',
  f"""<p>This guide is written for owners who are about to take an SBA loan and want to know how it shows up on the return. It covers general federal rules as of {NOWTXT}; state rules, entity type and your facts can change the answer.</p>
    <h2>1. Interest: generally deductible</h2>
    <p>Interest you pay on a loan used in your trade or business is generally deductible as a business expense under {A('https://www.law.cornell.edu/uscode/text/26/163','Internal Revenue Code Section 163')}; {A('https://www.irs.gov/publications/p535','IRS Publication 535')} explains business interest. The loan proceeds are not income, and repaying principal is not a deduction. Only the interest, and the cost of obtaining the loan, flow through the profit and loss statement.</p>
    <h2>2. The Section 163(j) limit and the small-business exemption</h2>
    <p>Section 163(j) caps the business interest a taxpayer can deduct in a year. Many small businesses are exempt: a business generally qualifies if its average annual gross receipts for the three prior tax years are at or below an inflation-adjusted threshold, which the IRS lists as <strong>$32 million for 2026</strong> ({A(IRSQA,'IRS questions and answers on the business interest limitation')}). If you are under it, you do not compute the limit. If you are over it, you file {A('https://www.irs.gov/forms-pubs/about-form-8990','Form 8990')} ({A('https://www.irs.gov/instructions/i8990','instructions')}) and any disallowed interest carries forward. Gross receipts of related businesses can be aggregated, so check the group, not only the one entity that signs the note.</p>
    <h2>3. The guarantee fee and closing costs are usually amortized</h2>
    <p>The SBA upfront guarantee fee, the lender's fees and other costs of obtaining the loan are generally treated as debt issuance costs, which are deducted over the term of the loan under {A('https://www.law.cornell.edu/cfr/text/26/1.446-5','Treasury Regulation 1.446-5')} rather than in the year paid. This is true even if the fee is financed into the loan. If the loan is repaid early, the unamortized balance is generally deductible at that point. Some costs, such as appraisal fees tied to buying property, may instead be added to the property&rsquo;s cost basis; ask your CPA to classify each line on the closing statement.</p>
    <h2>4. A worked example</h2>
    <p>Take the <a href="/loans/sba-7a#worked-example">$350,000, 10-year, 10.00% example</a>. The fee is $7,875 (3% of the $262,500 guaranteed portion). In year one, about $34,034 of the payments is interest. If the fee is amortized evenly over 10 years it adds about $788 a year of deduction, so the year-one financing cost on the return is roughly $34,822. At an illustrative 24% combined federal rate for a pass-through owner, that is about $8,357 of tax reduction; your rate will differ. The point for planning: the deduction is smaller than the fee you paid in cash at closing, and it is largest in the early years because interest is front-loaded (see the amortization table in the <a href="/calculators/sba-7a">SBA 7(a) calculator</a>).</p>
    <h2>5. Mixed-use proceeds and tracing</h2>
    <p>Interest is generally classified by how the proceeds are spent, not by what secures the loan ({A('https://www.law.cornell.edu/cfr/text/26/1.163-8T','Treas. Reg. 1.163-8T')}). Proceeds used for business operations support a business-interest deduction; proceeds used for personal purposes do not. Interest on money used to build or produce property may have to be capitalized instead of deducted. Deposit loan proceeds into a business account, pay vendors from it, and keep a simple use-of-proceeds schedule, especially for a business purchase where part of the money pays the seller and part funds working capital.</p>
    <h2>6. S corporations, partnerships and personal guarantees</h2>
    <ul>
      <li><strong>S corporations:</strong> a loan made to the corporation produces interest at the corporation level, which flows to shareholders on the K-1. A personal guarantee of the corporation&rsquo;s loan does not, by itself, increase a shareholder&rsquo;s stock basis; basis generally increases only if the shareholder actually pays on the guarantee or lends money directly. Loans the owner makes to the company are tracked separately. See the IRS page on {A('https://www.irs.gov/businesses/small-businesses-self-employed/s-corporations','S corporations')}.</li>
      <li><strong>Partnerships and LLCs:</strong> debt allocations affect partners&rsquo; basis and at-risk amounts; recourse and nonrecourse treatment matters.</li>
      <li><strong>Sole proprietors:</strong> interest goes on Schedule C if the loan is used in the business.</li>
      <li><strong>Reasonable compensation:</strong> loan proceeds do not fix a low-salary problem. S corporation owner-employees must be paid reasonable compensation, which also drives the cash flow lenders see.</li>
    </ul>
    <h2>7. Multi-state and credits</h2>
    <p>States do not always follow the federal interest limitation or the amortization timing, so a multi-state business should check each state&rsquo;s conformity. Tax credits, including research credits, reduce tax, not operating cash flow, so lenders generally still evaluate repayment from pre-tax earnings; they do not change the DSCR math in <a href="/guides/dscr-cpa-view">DSCR from a CPA&rsquo;s view</a>.</p>
    <h2>8. What to bring to your CPA</h2>
    <ul><li>The final closing statement with every fee, and which fees were financed</li><li>The note and the amortization schedule (<a href="/calculators/sba-7a">calculator</a>)</li><li>Your annual interest statement; ask the lender if one is not issued automatically</li><li>A use-of-proceeds schedule with dates and amounts</li><li>Related-party gross receipts, if you may be near the $32 million line</li></ul>
    <h2>9. Checklist before you sign</h2>
    <ol><li>Decide which entity will borrow, and who guarantees.</li><li>Ask the lender whether the fee will be paid in cash or financed.</li><li>Open a dedicated account for proceeds.</li><li>Set up fee amortization in your books at closing, not at year end.</li><li>Compare the after-tax cost of the loan, not only the rate, when you <a href="/compare/sba-7a-vs-504">compare loan options</a>.</li></ol>
    <p class="lf-disclaimer">General information, not tax advice. Tax law changes and depends on your facts; consult a CPA or tax professional before you act. Related: <a href="/guides/owner-add-backs-ebitda">owner add-backs and EBITDA normalization</a>, <a href="/guides/sba-7a-step-by-step">SBA 7(a) step by step</a>.</p>""",
  faq=[('Is SBA loan interest tax deductible?', 'Interest on a loan used for business purposes is generally deductible, subject to limits such as Section 163(j). Interest on proceeds used for personal purposes is not.'),
       ('Can I deduct the SBA guarantee fee in the year I pay it?', 'Generally no. It is usually treated as a debt issuance cost and deducted over the life of the loan, even if it is financed into the loan.'),
       ('Does the Section 163(j) limit apply to my small business?', 'Many small businesses are exempt if average annual gross receipts for the prior three years are at or below the inflation-adjusted threshold, which the IRS lists as $32 million for 2026. Related businesses can be aggregated.'),
       ('Does my personal guarantee increase my S corporation basis?', 'Generally no. A guarantee alone does not increase stock basis; paying on the guarantee or lending money directly to the company can.'),
       ('Where do I report loan interest?', 'On the return that matches the borrowing entity: Schedule C for a sole proprietor, Form 1120-S for an S corporation, Form 1065 for a partnership.')])

make('guides/owner-add-backs-ebitda.html', 'Owner Add-Backs and EBITDA Normalization',
  'How lenders and buyers adjust a small business income statement: EBITDA, seller discretionary earnings, common add-backs, a worked example and the documentation lenders expect.',
  'Owner Add-Backs and EBITDA Normalization',
  'Normalization adjusts reported profit for items that are not part of ongoing operations, such as owner pay above market, personal expenses, one-time costs, interest and depreciation, to show what a new owner or lender can expect the business to earn. Each add-back needs documentation that ties to the tax returns and books, and lenders accept only what they can verify.',
  f"""<p>If you are buying or selling an owner-operated business, or borrowing against one, the number everyone argues about is not net income. It is adjusted earnings. This guide explains how the adjustments work, how they flow into a lender&rsquo;s coverage test, and where they go wrong. Figures are illustrations as of {NOWTXT}.</p>
    <h2>EBITDA vs. SDE vs. net income</h2>
    <ul><li><strong>EBITDA</strong>: net income plus interest, taxes, depreciation and amortization. It measures operating earnings before financing and tax choices.</li><li><strong>Adjusted (normalized) EBITDA</strong>: EBITDA after add-backs for non-operating and one-time items, and after replacing the owner&rsquo;s pay with what a manager would cost.</li><li><strong>Seller&rsquo;s discretionary earnings (SDE)</strong>: earnings before one owner&rsquo;s compensation and benefits, also adjusted. Brokers use SDE for smaller businesses where the owner works in the business. The <a href="/calculators/business-acquisition">business acquisition calculator</a> starts from SDE and subtracts a market salary for the operator, because a lender will want the new owner paid.</li></ul>
    <h2>A worked example</h2>
    <div style="overflow-x:auto"><table class="lf-table"><thead><tr><th>Line</th><th>Amount</th><th>Note</th></tr></thead><tbody>
      <tr><td>Net income (S corporation)</td><td>$120,000</td><td>Per tax return</td></tr>
      <tr><td>+ Interest</td><td>$12,000</td><td>Existing debt, paid off at sale</td></tr>
      <tr><td>+ Depreciation and amortization</td><td>$28,000</td><td>Non-cash</td></tr>
      <tr><td><strong>= EBITDA</strong></td><td><strong>$160,000</strong></td><td></td></tr>
      <tr><td>+ Personal vehicle and travel</td><td>$9,000</td><td>Needs receipts and a vehicle log</td></tr>
      <tr><td>+ One-time legal settlement</td><td>$15,000</td><td>Needs the settlement agreement</td></tr>
      <tr><td>+ Owner pay above market ($140,000 paid, $80,000 to replace)</td><td>$60,000</td><td>Needs a role description and a market wage source</td></tr>
      <tr><td><strong>= Adjusted EBITDA</strong></td><td><strong>$244,000</strong></td><td>Cash flow a lender may test</td></tr>
      <tr><td><strong>SDE</strong> (EBITDA + personal + one-time + full owner pay of $140,000)</td><td><strong>$324,000</strong></td><td>Before any replacement salary</td></tr>
    </tbody></table></div>
    <p>At a 2.8x SDE multiple that business is priced near $907,000. A lender, though, will test repayment from a cash-flow figure it can verify. Suppose the annual debt service on the acquisition is about $120,921 (the starting case in the <a href="/calculators/business-acquisition">acquisition calculator</a>). Adjusted EBITDA of $244,000 gives a coverage ratio of about 2.02x. If the lender rejects the $15,000 settlement and the $9,000 of vehicle costs as unsupported, the figure is $220,000 and the ratio is about 1.82x. Each $10,000 of rejected add-backs moves this ratio by about 0.08x, and on a thinner deal that is the difference between approval and a decline.</p>
    <h2>Common add-backs, and the proof lenders want</h2>
    <ul>
      <li><strong>Excess owner compensation.</strong> Compare actual W-2 pay and benefits with the cost to hire someone for the same role. For an S corporation, owner-employees must also receive reasonable compensation ({A('https://www.irs.gov/businesses/small-businesses-self-employed/s-corporation-compensation-and-medical-insurance-issues','IRS: S corporation compensation')}), so the add-back cannot take pay below a defensible wage.</li>
      <li><strong>Personal expenses.</strong> Vehicles, travel, meals, family cell phones. Needs ledger detail and receipts. Expect scrutiny of anything that also looks like a normal operating cost.</li>
      <li><strong>One-time or non-recurring costs.</strong> Litigation, a move, a failed project. Needs the document that proves it happened once.</li>
      <li><strong>Non-cash items.</strong> Depreciation and amortization. These are routine, but replacement capital spending is still real; a buyer will ask what equipment must be replaced.</li>
      <li><strong>Related-party rent or loans.</strong> Restate to market rent and remove related-party interest if it ends at closing.</li>
    </ul>
    <h2>Add-backs that usually fail</h2>
    <ul><li>Cash revenue not in the books or on the return (the lender cannot count what was never reported)</li><li>Recurring costs relabeled as one-time</li><li>A salary add-back that leaves the operator unpaid</li><li>Projected savings or growth presented as historical earnings</li></ul>
    <h2>Multi-state and pass-through details</h2>
    <p>For multi-state operators, confirm payroll and state tax filings are consistent before adding anything back; unfiled states are a diligence problem, not an add-back. S corporation distributions are not compensation, so a low W-2 with large distributions can overstate normalized earnings once a reasonable wage is applied. Flow-through income also means the owner&rsquo;s tax is paid personally, which matters in a <a href="/guides/dscr-cpa-view">global coverage test</a>.</p>
    <h2>How this feeds the loan</h2>
    <p>SBA lenders decide repayment ability from historical financial statements and tax returns, so a clean, documented set of add-backs matters as much as the number itself. Pair this guide with the <a href="/guides/loan-documents">documents lenders ask for</a>, the <a href="/calculators/cash-to-close">cash-to-close estimator</a>, and the <a href="/loans/sba-7a">SBA 7(a) page</a> for terms (see <a href="https://www.sba.gov/funding-programs/loans/7a-loans" target="_blank" rel="noopener noreferrer">SBA 7(a) loans</a>).</p>
    <h2>Checklist</h2>
    <ol><li>Start from the filed returns for the last three years.</li><li>List every add-back with the document that supports it.</li><li>Replace owner pay with a market wage and note the source.</li><li>Show replacement capital spending separately.</li><li>Reconcile adjusted earnings to bank deposits.</li></ol>
    <p class="lf-disclaimer">General information, not valuation, accounting, tax or legal advice. Examples are illustrations, not market data.</p>""",
  faq=[('What is the difference between EBITDA and SDE?', 'EBITDA excludes interest, taxes, depreciation and amortization. SDE also adds back one owner&rsquo;s pay and benefits, and is common for owner-operated businesses.'),
       ('Do lenders accept all add-backs?', 'No. Lenders generally accept adjustments they can tie to tax returns, financial statements and other documents, and may reject the rest.'),
       ('Should I replace owner pay when normalizing earnings?', 'Yes. A lender expects the operator to be paid, so adjusted earnings are usually shown after a market wage for the role.'),
       ('Can cash revenue be added back?', 'Generally no. Lenders cannot count income that is not in the books and on the tax return.')])

make('guides/dscr-cpa-view.html', 'DSCR From a CPA\'s View',
  'How a CPA reads debt service coverage: which earnings number to use, owner pay and taxes for pass-through owners, business versus global DSCR, worked examples and common mistakes.',
  'DSCR From a CPA&rsquo;s View',
  'DSCR is cash flow available for debt service divided by annual principal and interest payments. Many lenders look for at least 1.25x, but the result depends on which earnings number you use, how owner pay and taxes are treated, and whether the lender tests the business alone or all of your obligations together (global DSCR).',
  f"""<p>The general formula is on our <a href="/guides/dscr-explained">DSCR explainer</a>. This guide is about what changes the result: the numerator. All figures are illustrations as of {NOWTXT}; lender methods differ.</p>
    <h2>Three common ways to build the numerator</h2>
    <ol>
      <li><strong>EBITDA basis.</strong> Net income plus interest, depreciation and amortization, divided by annual principal and interest. Simple, and generous to pass-through owners because it ignores their personal taxes.</li>
      <li><strong>After owner pay.</strong> EBITDA minus a market wage for the operator. This is how the <a href="/calculators/dscr">DSCR calculator</a> and our <a href="/calculators/business-acquisition">acquisition calculator</a> treat acquisitions.</li>
      <li><strong>Global.</strong> Business cash flow plus the owners&rsquo; other income, minus personal taxes and living expenses, divided by business debt service plus personal debt payments.</li>
    </ol>
    <h2>Example 1: the same business, several answers</h2>
    <p>Use the business from the <a href="/guides/owner-add-backs-ebitda">add-backs guide</a> and the acquisition starting case, where annual debt service is $120,921.</p>
    <div style="overflow-x:auto"><table class="lf-table"><thead><tr><th>Lens</th><th>Cash flow</th><th>Debt service</th><th>DSCR</th></tr></thead><tbody>
      <tr><td>SDE (no pay deducted for the operator)</td><td>$324,000</td><td>$120,921</td><td>2.68x</td></tr>
      <tr><td>Adjusted EBITDA (after an $80,000 market operator salary)</td><td>$244,000</td><td>$120,921</td><td>2.02x</td></tr>
      <tr><td>Adjusted EBITDA, unsupported add-backs removed ($24,000)</td><td>$220,000</td><td>$120,921</td><td>1.82x</td></tr>
      <tr><td>Same, stressed for a 15% earnings drop</td><td>$187,000</td><td>$120,921</td><td>1.55x</td></tr>
    </tbody></table></div>
    <p>The business did not change; the lens did. SDE flatters the result because the new owner must be paid, which is why lenders subtract a market salary and why unsupported add-backs matter. A lender that stresses earnings is asking how much cushion remains if results slip.</p>
    <h2>Example 2: global DSCR</h2>
    <p>Consider a different, smaller owner-operated business. Suppose its cash flow after the operator&rsquo;s salary is $180,000 and a spouse earns $40,000. Personal income taxes and living expenses are $70,000. Business debt service is $120,921 and personal debts (mortgage and a car) are $30,000 a year.</p>
    <p>Business DSCR: $180,000 &divide; $120,921 = <strong>1.49x</strong>.<br>Global DSCR: ($180,000 + $40,000 &minus; $70,000) &divide; ($120,921 + $30,000) = $150,000 &divide; $150,921 = <strong>0.99x</strong>.</p>
    <p>A business that passes alone can fail when the owner&rsquo;s household is counted. Lenders that use a global test usually ask for personal tax returns, a personal financial statement and a debt schedule, so gather them before you apply (see <a href="/guides/checklist">the loan document checklist</a>).</p>
    <h2>Owner pay, taxes and pass-through entities</h2>
    <ul><li>For S corporations, reasonable compensation must be paid before distributions; a low-salary, high-distribution structure overstates coverage once a lender normalizes pay.</li><li>Partnership and LLC owners pay tax personally on allocated income whether or not it is distributed, which a global test reflects.</li><li>C corporations pay entity-level tax, so the numerator is commonly after-tax earnings plus non-cash items.</li></ul>
    <h2>What lenders also adjust</h2>
    <ul><li><strong>Debt service:</strong> they use the new loan&rsquo;s payment plus existing obligations that remain, including equipment leases and owner loans; the <a href="/loans/sba-7a#worked-example">$350,000 SBA example</a> has an annual payment of about $55,503 on its own.</li><li><strong>Seasonality:</strong> a strong year can hide weak quarters; lenders may review monthly results.</li><li><strong>Capital expenditures:</strong> maintenance spending is real cash even when depreciation is non-cash.</li><li><strong>Fees:</strong> the SBA guarantee fee is financed or paid at closing; see the <a href="/guides/sba-loan-interest-tax-treatment">tax treatment guide</a>.</li></ul>
    <h2>Common mistakes</h2>
    <ul><li>Using EBITDA while ignoring taxes an owner must pay on pass-through income</li><li>Forgetting existing debt payments, including owner loans and leases</li><li>Using projections without support</li><li>Ignoring the minimum a specific lender uses; there is no single SBA-wide DSCR, so ask the lender how it calculates it</li></ul>
    <h2>How to improve DSCR before you apply</h2>
    <ol><li>Lengthen the term, which lowers the payment; compare terms in the <a href="/calculators/loan-payment">loan payment calculator</a>.</li><li>Increase the down payment (<a href="/calculators/sba-equity-injection">equity injection calculator</a>).</li><li>Pay down or refinance small, high-payment debts first.</li><li>Document legitimate add-backs early.</li><li>Choose the loan structure deliberately; compare <a href="/compare/sba-7a-vs-504">7(a) and 504</a>.</li></ol>
    <p class="lf-disclaimer">General information, not tax or financial advice. Lender minimums and methods differ.</p>""",
  faq=[('What DSCR do lenders want?', 'Many look for at least 1.25x, but each lender sets its own minimum and method, so ask how yours calculates it.'),
       ('What is global DSCR?', 'A coverage ratio that combines business cash flow with the owners&rsquo; other income and subtracts personal taxes and living costs, then divides by business and personal debt payments.'),
       ('Does DSCR use EBITDA or net income?', 'It depends on the lender. Many start from EBITDA, then subtract owner compensation and, for pass-through entities, sometimes owner taxes.'),
       ('How can I improve my DSCR?', 'Lengthen the term, increase your down payment, reduce other debt payments and document legitimate add-backs.')])


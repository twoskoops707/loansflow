#!/usr/bin/env python3
"""Generates calculators/business-acquisition.html and calculators/cash-to-close.html from calculators/sba-7a.html."""
import re, json, pathlib
PUB = pathlib.Path(__file__).resolve().parent.parent / 'public'
src = (PUB / 'calculators/sba-7a.html').read_text()
PAGES = {
 'business-acquisition': dict(
  title='SBA business acquisition calculator', calc='acquire',
  desc='Model buying a business with an SBA 7(a) loan: sources and uses, equity injection, guarantee fee, payments and DSCR from seller earnings.',
  lede='Model buying a business with an SBA 7(a) loan: how much you borrow, how much cash you bring, and whether the earnings cover the payments.',
  body='''<p class="lf-figcap">Updated November 11, 2026. Fee schedule: <a href="https://www.sba.gov/document/information-notice-5000-881797-fy-2027-7a-program-fees" target="_blank" rel="noopener noreferrer">SBA Information Notice 5000-881797</a> (FY 2027). Math reviewed against our <a href="/methodology">methodology</a>.</p>
    <h2>How to use it</h2>
    <p>Enter the purchase price, any working capital you want to borrow and your expected closing costs. Set your equity injection (the SBA minimum for a change of ownership is 10% of the project) and, if the seller will carry a note, its size. Then enter the business&rsquo;s seller&rsquo;s discretionary earnings (SDE) and the market salary you would pay yourself as the operator. The result shows your cash at closing, the SBA loan and payment, and the debt service coverage ratio (DSCR).</p>
    <h2>How it is calculated</h2>
    <p>Total uses are price plus working capital plus closing costs. Equity is your percentage of total uses. The SBA loan is what remains after equity and any seller note, plus the SBA guarantee fee if you choose to finance it. The fee is a percentage of the SBA-guaranteed portion (75% on loans over $150,000) and the tier is set by the gross loan amount, so financing the fee can move a loan into the next tier. Cash flow available for debt service is SDE minus the owner&rsquo;s market salary; DSCR is that figure divided by annual debt service (SBA loan plus seller note).</p>
    <h2>Worked example</h2>
    <p>A $750,000 purchase with $50,000 of working capital and $25,000 of costs is $825,000 of uses. At 10% equity you bring $82,500. The SBA loan is about $742,500 before the fee; at 3.5% of the guaranteed portion the fee is about $20,016, and financing it brings the loan to about $762,516. At 10.00% over 10 years the payment is about $10,077 a month ($120,920 a year). With SDE of $260,000 and an $80,000 owner salary, cash flow is $180,000 and DSCR is about 1.49x. Those are the calculator&rsquo;s starting values, so you can reproduce them above. Rate shown: prime 7.00% (FRED DPRIME, October 27, 2026) plus 3.00%; your rate will differ.</p>
    <h2>What lenders also look at</h2>
    <p>DSCR is only one test. Lenders review the business valuation and the add-backs behind SDE, collateral, your industry experience and your personal credit. A CPA&rsquo;s view of how earnings were normalized matters; see <a href="/guides/owner-add-backs-ebitda">owner add-backs and EBITDA normalization</a> and <a href="/guides/dscr-cpa-view">DSCR from a CPA&rsquo;s view</a>.</p>
    <h2>Common questions</h2>
    <div class="lf-faq"><details><summary>How much down payment do I need to buy a business with an SBA loan?</summary><p>The SBA requires at least 10% equity injection on a change of ownership, and your lender may require more. Seller notes can count toward the injection only under specific SBA rules, so confirm with your lender.</p></details><details><summary>What DSCR do SBA lenders look for?</summary><p>Many lenders look for at least 1.25x, but each lender sets its own minimum.</p></details><details><summary>Can I finance the SBA guarantee fee?</summary><p>Often yes; the fee can be added to the loan. That raises the loan amount and payment slightly.</p></details></div>
    <h2>About this calculator</h2>
    <p>This tool runs entirely in your browser; nothing you type is sent anywhere. Results are estimates, not offers or quotes. See <a href="/methodology">how our numbers work</a>.</p>
    <p>Read the <a href="/loans/sba-7a">SBA 7(a) Loan</a> page for requirements and how to apply, or compare it with the <a href="/compare/sba-7a-vs-504">504 loan</a>.</p>
    <h2>Related calculators</h2>
    <ul><li><a href="/calculators/cash-to-close">SBA cash-to-close estimator</a></li><li><a href="/calculators/sba-7a">SBA 7(a) loan calculator</a></li><li><a href="/calculators/sba-equity-injection">SBA down payment (equity injection) calculator</a></li><li><a href="/calculators/dscr">Debt service coverage (DSCR) calculator</a></li><li><a href="/calculators/">All calculators</a></li></ul>''',
  faq=[('How much down payment do I need to buy a business with an SBA loan?','The SBA requires at least 10% equity injection on a change of ownership, and your lender may require more.'),('What DSCR do SBA lenders look for?','Many lenders look for at least 1.25x, but each lender sets its own minimum.'),('Can I finance the SBA guarantee fee?','Often yes; the fee can be added to the loan, which raises the loan amount and payment slightly.')]),
 'cash-to-close': dict(
  title='SBA cash-to-close estimator', calc='cashclose',
  desc='Estimate the total cash needed to close an SBA-financed purchase: down payment, SBA guarantee fee, lender fees, third-party reports, legal and reserves.',
  lede='Estimate the total cash you need at closing on an SBA-financed purchase, not just the down payment.',
  body='''<p class="lf-figcap">Updated November 11, 2026. Fee schedule: <a href="https://www.sba.gov/document/information-notice-5000-881797-fy-2027-7a-program-fees" target="_blank" rel="noopener noreferrer">SBA Information Notice 5000-881797</a> (FY 2027). Math reviewed against our <a href="/methodology">methodology</a>.</p>
    <h2>How to use it</h2>
    <p>Enter the total project cost and your down payment percentage, choose whether the SBA guarantee fee is paid in cash or financed into the loan, then enter your expected lender fee and third-party costs. The estimate adds your down payment, the guarantee fee (if paid in cash), lender and packaging fees, appraisal and environmental reports, legal and title, prepaid insurance and a working capital reserve.</p>
    <h2>How it is calculated</h2>
    <p>The loan is the project cost minus your down payment. The guarantee fee is a percentage of the SBA-guaranteed portion: 2% on loans up to $150,000, 3% from $150,001 to $700,000 and 3.5% above that on the first $1 million guaranteed (FY 2027). The lender fee is a percentage of the loan. All other lines are the amounts you enter, because they vary by lender, property and state.</p>
    <h2>Worked example</h2>
    <p>On a $700,000 project with 10% down, you put down $70,000 and borrow $630,000. The SBA guarantees 75%, or $472,500, so the fee at 3% is $14,175. With a 1% lender fee ($6,300), $8,000 of reports, $6,000 of legal and title, $4,000 of prepaid items and a $25,000 reserve, the estimate is about $133,475 of cash to close. Those are the calculator&rsquo;s starting values, so you can reproduce them above.</p>
    <h2>Common questions</h2>
    <div class="lf-faq"><details><summary>Is the down payment the only cash I need at closing?</summary><p>No. Fees, third-party reports, legal costs, prepaid items and any reserve your lender requires are usually additional.</p></details><details><summary>Who pays the SBA guarantee fee?</summary><p>The lender pays it to the SBA and normally passes it to the borrower, either in cash at closing or financed into the loan.</p></details></div>
    <h2>About this calculator</h2>
    <p>This tool runs entirely in your browser; nothing you type is sent anywhere. Results are planning estimates, not quotes; ask your lender for a written fee estimate. See <a href="/methodology">how our numbers work</a>.</p>
    <h2>Related calculators</h2>
    <ul><li><a href="/calculators/business-acquisition">SBA business acquisition calculator</a></li><li><a href="/calculators/sba-7a">SBA 7(a) loan calculator</a></li><li><a href="/calculators/sba-equity-injection">SBA down payment (equity injection) calculator</a></li><li><a href="/calculators/">All calculators</a></li></ul>''',
  faq=[('Is the down payment the only cash I need at closing?','No. Fees, third-party reports, legal costs, prepaid items and any reserve your lender requires are usually additional.'),('Who pays the SBA guarantee fee?','The lender pays it to the SBA and normally passes it to the borrower, in cash at closing or financed into the loan.')]),
}
for slug, p in PAGES.items():
    h = src
    url = f'https://loansflow.loan/calculators/{slug}'
    t = p['title'] + ' | LoansFlow'
    h = re.sub(r'<title>.*?</title>', f'<title>{t}</title>', h, flags=re.S)
    h = re.sub(r'(<meta name="description" content=")[^"]*"', r'\g<1>' + p['desc'] + '"', h)
    h = re.sub(r'(<link rel="canonical" href=")[^"]*"', r'\g<1>' + url + '"', h)
    h = re.sub(r'(<meta property="og:title" content=")[^"]*"', r'\g<1>' + t + '"', h)
    h = re.sub(r'(<meta property="og:description" content=")[^"]*"', r'\g<1>' + p['desc'] + '"', h)
    h = re.sub(r'(<meta property="og:url" content=")[^"]*"', r'\g<1>' + url + '"', h)
    # JSON-LD blocks
    def fix(m):
        body = m.group(1)
        try: d = json.loads(body)
        except Exception: return m.group(0)
        if 'sba-7a' in body and '@graph' in d:
            d['@graph'][0].update({'@id': url + '#webpage', 'url': url, 'name': t})
            for e in d['@graph']:
                if e.get('@type') == 'BreadcrumbList':
                    e['itemListElement'][-1]['name'] = p['title']; e['itemListElement'][-1].pop('item', None)
        elif d.get('@type') == 'WebApplication':
            d.update({'name': p['title'], 'url': url, 'description': p['desc']})
        elif d.get('@type') == 'FAQPage':
            d['mainEntity'] = [{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in p['faq']]
        return '<script type="application/ld+json">\n' + json.dumps(d, indent=2) + '\n</script>'
    h = re.sub(r'<script type="application/ld\+json">([\s\S]*?)</script>', fix, h)
    # nav current marker
    h = h.replace(' aria-current="page"', '', 1) if False else h
    # body
    a = h.index('<p class="lf-crumbs">'); b = h.index('<section class="author-box">')
    new = (f'<p class="lf-crumbs"><a href="/">Home</a> / <a href="/calculators/">Calculators</a> / {p["title"]}</p>\n'
           f'    <p class="lf-eyebrow">Calculator</p>\n    <h1>{p["title"]}</h1>\n    <p class="lf-lede">{p["lede"]}</p>\n'
           f'    <div data-calc="{p["calc"]}"></div>\n    <div class="ad-slot" data-ad-format="rectangle" data-ad-name="calc-{slug}" style="margin:2rem 0;"></div>\n    {p["body"]}\n  ')
    h = h[:a] + new + h[b:]
    (PUB / f'calculators/{slug}.html').write_text(h)
    print('wrote', slug)

#!/usr/bin/env python3
"""Rebuilds the primary nav and footer link columns on every page from one definition. Idempotent."""
import re, glob, pathlib
PUB = pathlib.Path(__file__).resolve().parent.parent / 'public'
idx = (PUB / 'index.html').read_text()
nav = re.search(r'<nav id="nav-menu"[^>]*>([\s\S]*?)</nav>', idx).group(1)
items = re.split(r'(?=\n        <div class="nav-item has-menu)', nav)
loan = next(i for i in items if 'href="/loans/">Loan types' in i)
calc = next(i for i in items if 'href="/calculators/">Calculators' in i)
fund = next(i for i in items if 'Funding ideas' in i or 'Funding' in i and 'alternative-financing' in i)
icon = re.search(r'<a href="/grants/"><i class="mi">(<svg[\s\S]*?</svg>)</i>', idx).group(1)
dscr_icon = re.search(r'<a href="/calculators/dscr"><i class="mi">(<svg[\s\S]*?</svg>)</i>', idx).group(1)
def strip_cur(s): return s.replace(' aria-current="page"', '')
loan, calc, fund = strip_cur(loan).strip('\n'), strip_cur(calc).strip('\n'), strip_cur(fund).strip('\n')
fund = fund[:fund.index('</div></div>') + len('</div></div>')].replace('>Funding ideas<', '>Funding<').replace('Lender and SBA office directory', 'SBA office and lender phone directory').replace('<span>Find help near you</span>', '<span>Phone numbers for SBA offices and lenders</span>')
def entry(href, title, sub, ic=icon): return f'<a href="{href}"><i class="mi">{ic}</i><b><strong>{title}</strong><span>{sub}</span></b></a>'
# add the two new calculators to the Business column of the Calculators mega menu
new_calcs = entry('/calculators/business-acquisition', 'Business acquisition', 'Cash to close, loan and DSCR for a purchase', dscr_icon) + entry('/calculators/cash-to-close', 'SBA cash to close', 'Down payment plus fees and reserves', dscr_icon)
if 'business-acquisition' not in calc:
    anchor = '<a href="/calculators/dscr">'
    calc = calc.replace(anchor, new_calcs + anchor, 1)

# third column with the newer business tools, and a live calculator count
if 'sba-guarantee-fee' not in calc:
    tools = [('/calculators/sba-guarantee-fee', 'SBA guarantee fee', 'Upfront fee by loan size'), ('/calculators/global-dscr', 'Global DSCR', 'Business plus personal cash flow'),
             ('/calculators/how-much-can-i-borrow', 'How much can I borrow', 'Loan size from your P&amp;L'), ('/calculators/business-valuation-sde', 'Business valuation (SDE)', 'Price from seller earnings'),
             ('/calculators/merchant-cash-advance-cost', 'Merchant cash advance cost', 'Factor rate to APR'), ('/calculators/prepayment-penalty', 'Prepayment penalty', 'Fee versus interest saved')]
    col = '<div class="mega-col"><div class="mega-h">More business tools</div>' + ''.join(entry(h, a, b, dscr_icon) for h, a, b in tools) + '</div>'
    calc = calc.replace('<a class="mega-all"', col + '<a class="mega-all"', 1)
ncalc = len(list((PUB / 'calculators').glob('*.html'))) - 1
calc = re.sub(r'All \d+ calculators', f'All {ncalc} calculators', calc)
def menu(label, href, entries): return f'        <div class="nav-item has-menu"><a class="nav-top" href="{href}">{label}</a>\n          <div class="nav-menu">' + ''.join(entries) + '</div></div>'
guides = menu('Guides', '/guides/', [
  entry('/guides/', 'All guides', 'Playbooks, checklists and the glossary'),
  entry('/compare/', 'Compare business loans', 'SBA 7(a) vs 504, vs conventional, vs online'),
  entry('/guides/dscr-cpa-view', "DSCR from a CPA's view", 'How lenders read your cash flow'),
  entry('/guides/owner-add-backs-ebitda', 'Add-backs and EBITDA', 'Normalizing earnings for a lender'),
  entry('/guides/sba-loan-interest-tax-treatment', 'SBA interest and taxes', 'What is deductible and what is amortized'),
  entry('/guides/sba-7a-step-by-step', 'SBA 7(a) 10-step playbook', 'From eligibility to funding'),
  entry('/research/', 'SBA loan data', 'Original analysis of SBA 7(a) approvals'),
  entry('/resources/', 'Free templates', 'Checklists and worksheets to download')])
news = menu('News &amp; rates', '/news/', [
  entry('/news/', 'Rates and headlines', 'Prime, mortgage averages, daily news'),
  entry('/loans/sba-7a-rates', 'SBA 7(a) current rates', 'Prime plus the SBA spread, with history'),
  entry('/calculators/mortgage-payment', 'Mortgage payment calculator', 'Starts from the latest weekly average'),
  entry('/methodology', 'How we source rates', 'FRED, Freddie Mac and SBA notices')])
about = menu('About', '/about', [
  entry('/about', 'About LoansFlow', 'What we do and what we are not'),
  entry('/author', 'About the author', 'Joshua Miller, CPA'),
  entry('/editorial-policy', 'Editorial policy', 'How we check and date our facts'),
  entry('/disclosure', 'Advertising and affiliates', 'How the site is funded'),
  entry('/site-index', 'Site directory', 'Every page on LoansFlow, grouped'),
  entry('/contact', 'Contact', 'Questions and corrections')])
cta = '        <a class="nav-cta" href="/loans/">Find your loan</a>\n      '
NAV = '\n' + loan.strip('\n') + '\n' + calc.strip('\n') + '\n' + guides + '\n' + fund + '\n' + news + '\n' + about + '\n' + cta
def col(title, links): return '<div><div class="foot-h">' + title + '</div>' + ''.join(f'<a href="{u}">{t}</a>' for u, t in links) + '</div>'
LOANS = col('Loan types', [('/loans/sba-7a', 'SBA 7(a)'), ('/loans/sba-504', 'SBA 504'), ('/loans/sba-express', 'SBA Express'), ('/loans/sba-microloan', 'SBA Microloan'), ('/loans/line-of-credit', 'Line of credit'), ('/loans/commercial-term-loan', 'Commercial term loan'), ('/loans/equipment-financing', 'Equipment financing'), ('/loans/mortgage', 'Mortgage')])
LEARN = col('Learn', [('/guides/', 'All guides'), ('/compare/', 'Compare loans'), ('/guides/dscr-cpa-view', 'DSCR from a CPA&rsquo;s view'), ('/guides/owner-add-backs-ebitda', 'Add-backs and EBITDA'), ('/guides/sba-loan-interest-tax-treatment', 'SBA interest and taxes'), ('/guides/glossary', 'Glossary'), ('/wisdom/', 'Old-timer&rsquo;s guide')])
FUND = col('Resources', [('/research/', 'SBA loan data'), ('/resources/', 'Free templates'), ('/alternative-financing/', 'Uncommon ways to finance'), ('/grants/', 'Search grants'), ('/news/', 'News and rates'), ('/directory/', 'Phone directory'), ('/site-index', 'Site directory')])
SITE = col('About', [('/about', 'About LoansFlow'), ('/author', 'About the author'), ('/editorial-policy', 'Editorial policy'), ('/methodology', 'How our numbers work'), ('/contact', 'Contact')])
LEGAL = col('Legal', [('/privacy', 'Privacy'), ('/terms', 'Terms'), ('/disclaimer', 'Disclaimer'), ('/disclosure', 'Advertising and affiliate disclosure')])
sections = [('/loans/', 'Loan types'), ('/calculators/', 'Calculators'), ('/guides/', 'Guides'), ('/compare/', 'Guides'), ('/alternative-financing/', 'Funding'), ('/grants/', 'Funding'), ('/directory/', 'Funding'), ('/news/', 'News &amp; rates'), ('/about', 'About'), ('/site-index', 'About'), ('/author', 'About'), ('/editorial', 'About'), ('/disclosure', 'About'), ('/contact', 'About')]
n = 0
for f in glob.glob(str(PUB / '**/*.html'), recursive=True):
    p = pathlib.Path(f); rel = '/' + str(p.relative_to(PUB))
    h = p.read_text(); o = h
    m = re.search(r'(<nav id="nav-menu"[^>]*>)([\s\S]*?)(</nav>)', h)
    if not m: continue
    body = NAV
    for pre, label in sections:
        if rel.startswith(pre):
            body = re.sub(r'(<a class="nav-top" href="[^"]*")(>' + re.escape(label) + '</a>)', r'\1 aria-current="true"\2', body, count=1); break
    body = re.sub(r'<h4>([^<]*)</h4>', r'<div class="mega-h">\1</div>', body)
    h = h[:m.start(2)] + body + h[m.end(2):]
    h = re.sub(r'<h4>(Loan types|Learn|Site|Legal)</h4>', r'<div class="foot-h">\1</div>', h)
    if 'class="skip-link"' not in h: h = re.sub(r'(<body[^>]*>)', r'\1\n  <a class="skip-link" href="#main">Skip to main content</a>', h, count=1)
    if not re.search(r'<main[^>]*\bid="main"', h): h = re.sub(r'<main(?![^>]*\bid=)', '<main id="main"', h, count=1)
    # footer: rebuild all link columns, keep the brand block that is already on the page
    bm = re.search(r'<div class="footer-grid">\s*(<div><a class="foot-brand"[\s\S]*?</p></div>)', h)
    if bm:
        gs = h.index('<div class="footer-grid">'); ge = h.index('<div class="footer-note">')
        h = h[:gs] + '<div class="footer-grid">\n      ' + bm.group(1) + '\n      ' + '\n      '.join([LOANS, LEARN, FUND, SITE, LEGAL]) + '\n    </div>\n    ' + h[ge:]
    if h != o: p.write_text(h); n += 1
print('pages updated', n)

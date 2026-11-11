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
dscr_icon = re.search(r'<a href="/calculators/dscr.html"><i class="mi">(<svg[\s\S]*?</svg>)</i>', idx).group(1)
def strip_cur(s): return s.replace(' aria-current="page"', '')
loan, calc, fund = strip_cur(loan).strip('\n'), strip_cur(calc).strip('\n'), strip_cur(fund).strip('\n')
fund = fund[:fund.index('</div></div>') + len('</div></div>')].replace('>Funding ideas<', '>Funding<')
def entry(href, title, sub, ic=icon): return f'<a href="{href}"><i class="mi">{ic}</i><b><strong>{title}</strong><span>{sub}</span></b></a>'
# add the two new calculators to the Business column of the Calculators mega menu
new_calcs = entry('/calculators/business-acquisition.html', 'Business acquisition', 'Cash to close, loan and DSCR for a purchase', dscr_icon) + entry('/calculators/cash-to-close.html', 'SBA cash to close', 'Down payment plus fees and reserves', dscr_icon)
if 'business-acquisition' not in calc:
    anchor = '<a href="/calculators/dscr.html">'
    calc = calc.replace(anchor, new_calcs + anchor, 1)
def menu(label, href, entries): return f'        <div class="nav-item has-menu"><a class="nav-top" href="{href}">{label}</a>\n          <div class="nav-menu">' + ''.join(entries) + '</div></div>'
guides = menu('Guides', '/guides/', [
  entry('/guides/', 'All guides', 'Playbooks, checklists and the glossary'),
  entry('/compare/', 'Compare business loans', 'SBA 7(a) vs 504, vs conventional, vs online'),
  entry('/guides/dscr-cpa-view.html', "DSCR from a CPA's view", 'How lenders read your cash flow'),
  entry('/guides/owner-add-backs-ebitda.html', 'Add-backs and EBITDA', 'Normalizing earnings for a lender'),
  entry('/guides/sba-loan-interest-tax-treatment.html', 'SBA interest and taxes', 'What is deductible and what is amortized'),
  entry('/guides/sba-7a-step-by-step.html', 'SBA 7(a) 10-step playbook', 'From eligibility to funding')])
news = menu('News &amp; rates', '/news/', [
  entry('/news/', 'Rates and headlines', 'Prime, mortgage averages, daily news'),
  entry('/loans/sba-7a.html#rates', 'SBA maximum rates', 'Prime plus the SBA spread, by loan size'),
  entry('/calculators/mortgage-payment.html', 'Mortgage payment calculator', 'Starts from the latest weekly average'),
  entry('/methodology.html', 'How we source rates', 'FRED, Freddie Mac and SBA notices')])
about = menu('About', '/about.html', [
  entry('/about.html', 'About LoansFlow', 'What we do and what we are not'),
  entry('/author.html', 'About the author', 'Joshua Miller, CPA'),
  entry('/editorial-policy.html', 'Editorial policy', 'How we check and date our facts'),
  entry('/disclosure.html', 'Advertising and affiliates', 'How the site is funded'),
  entry('/contact.html', 'Contact', 'Questions and corrections')])
cta = '        <a class="nav-cta" href="/loans/">Find your loan</a>\n      '
NAV = '\n' + loan.strip('\n') + '\n' + calc.strip('\n') + '\n' + guides + '\n' + fund + '\n' + news + '\n' + about + '\n' + cta
sections = [('/loans/', 'Loan types'), ('/calculators/', 'Calculators'), ('/guides/', 'Guides'), ('/compare/', 'Guides'), ('/alternative-financing/', 'Funding'), ('/grants/', 'Funding'), ('/directory/', 'Funding'), ('/news/', 'News &amp; rates'), ('/about', 'About'), ('/author', 'About'), ('/editorial', 'About'), ('/disclosure', 'About'), ('/contact', 'About')]
n = 0
for f in glob.glob(str(PUB / '**/*.html'), recursive=True):
    p = pathlib.Path(f); rel = '/' + str(p.relative_to(PUB))
    h = p.read_text(); o = h
    m = re.search(r'(<nav id="nav-menu"[^>]*>)([\s\S]*?)(</nav>)', h)
    if not m: continue
    body = NAV
    for pre, label in sections:
        if rel.startswith(pre):
            body = re.sub(r'(<a class="nav-top" href="[^"]*")(>' + re.escape(label) + '</a>)', r'\1 aria-current="page"\2', body, count=1); break
    h = h[:m.start(2)] + body + h[m.end(2):]
    # footer columns
    if '/compare/">Compare loans' not in h and '<h4>Learn</h4>' in h:
        h = h.replace('<a href="/guides/">Guides</a>', '<a href="/guides/">Guides</a><a href="/compare/">Compare loans</a><a href="/guides/dscr-cpa-view.html">DSCR from a CPA&rsquo;s view</a><a href="/guides/owner-add-backs-ebitda.html">Add-backs and EBITDA</a><a href="/guides/sba-loan-interest-tax-treatment.html">SBA interest and taxes</a>', 1)
    if '/author.html">About the author' not in h and '<a href="/about.html">About</a>' in h:
        h = h.replace('<a href="/about.html">About</a>', '<a href="/about.html">About</a><a href="/author.html">About the author</a>', 1)
    if h != o: p.write_text(h); n += 1
print('pages updated', n)

#!/usr/bin/env python3
"""Builds public/site-index.html: a human-readable site directory (every indexable page, grouped). Re-run after adding pages."""
import re, html as H, pathlib
PUB = pathlib.Path(__file__).resolve().parent.parent / 'public'
GROUPS = [('Loan types', 'loans/'), ('Calculators', 'calculators/'), ('Guides', 'guides/'), ('Compare loans', 'compare/'),
          ('Funding, news and directories', None), ('About and policies', None)]
FUND = ['alternative-financing/', 'grants/', 'news/', 'directory/', 'wisdom/']
ABOUT = ['about.html', 'author.html', 'editorial-policy.html', 'methodology.html', 'disclosure.html', 'disclaimer.html', 'privacy.html', 'terms.html', 'contact.html']
def info(p):
    h = p.read_text()
    if re.search(r'<meta name="robots" content="[^"]*noindex', h): return None
    t = re.search(r'<h1[^>]*>([\s\S]*?)</h1>', h)
    t = re.sub(r'<[^>]+>', '', t.group(1)).strip() if t else p.stem
    return H.unescape(re.sub(r'\s+', ' ', t))
def rel_url(p):
    r = str(p.relative_to(PUB)); return '/' + (r[:-10] if r.endswith('/index.html') else r)
pages = {}
for p in sorted(PUB.rglob('*.html')):
    r = str(p.relative_to(PUB))
    if r in ('404.html', 'tools/index.html', 'site-index.html', 'index.html'): continue
    t = info(p)
    if t: pages[r] = (rel_url(p), t)
def li(r):
    u, t = pages[r]; return f'<li><a href="{u}">{H.escape(t)}</a></li>'
out = []
for name, prefix in GROUPS:
    if prefix: rs = [r for r in pages if r.startswith(prefix)]; rs.sort(key=lambda r: (not r.endswith('index.html'), pages[r][1]))
    elif name.startswith('Funding'): rs = [r for r in pages if any(r.startswith(f) for f in FUND)]
    else: rs = [r for r in ABOUT if r in pages]
    if rs: out.append(f'<h2>{name}</h2>\n    <ul>' + ''.join(li(r) for r in rs) + '</ul>')
src = (PUB / 'about.html').read_text()
head = src[:src.index('<main')]; tail = src[src.index('</main>') + 7:]
T = 'Site directory: every page on LoansFlow'
D = 'A complete list of the guides, calculators, loan pages, comparisons and policies on LoansFlow.'
head = re.sub(r'<title>[\s\S]*?</title>', f'<title>{T} | LoansFlow</title>', head)
head = re.sub(r'(<meta name="description" content=")[^"]*"', lambda m: m.group(1) + D + '"', head)
head = re.sub(r'(<link rel="canonical" href=")[^"]*"', r'\1https://loansflow.loan/site-index"', head)
head = re.sub(r'(<meta property="og:title" content=")[^"]*"', lambda m: m.group(1) + T + '"', head)
head = re.sub(r'(<meta property="og:description" content=")[^"]*"', lambda m: m.group(1) + D + '"', head)
head = re.sub(r'(<meta property="og:url" content=")[^"]*"', r'\1https://loansflow.loan/site-index"', head)
head = re.sub(r'<script type="application/ld\+json">[\s\S]*?</script>\s*', '', head)
main = ('<main id="main" class="legal-page">\n    <h1>Site directory</h1>\n    <p>Every page on LoansFlow, grouped by topic. Looking for a phone number or an office near you? Use the '
        '<a href="/directory/">SBA office and lender phone directory</a>, which is a separate page.</p>\n    <p><a href="/">Home</a></p>\n    ' + '\n    '.join(out) + '\n  </main>')
(PUB / 'site-index.html').write_text(head + main + tail)
print('site-index.html:', len(pages), 'pages')

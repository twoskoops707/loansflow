#!/usr/bin/env python3
"""Rewrites internal .html URLs to the extensionless form Cloudflare Pages serves (avoids a 308 hop on every click)."""
import re, glob, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / 'public'
n = 0
def fix(s):
    s = re.sub(r'(href=")(/[^"#?]*?)\.html((?:[#?][^"]*)?")', r'\1\2\3', s)                     # root-relative hrefs
    s = re.sub(r'(href=")(?!https?:|/|#|mailto:)([A-Za-z0-9_\-/.]*?)\.html((?:[#?][^"]*)?")', r'\1\2\3', s)  # relative hrefs
    s = re.sub(r'(https://loansflow\.loan/[^"\s<>\\]*?)\.html', r'\1', s)                        # absolute URLs (JSON-LD, llms.txt)
    s = re.sub(r'("u":\s*"/[^"]*?)\.html"', r'\1"', s)                                            # search index
    s = re.sub(r"(entry\('/[^']*?)\.html(#?[^']*',)", r'\1\2', s)                                 # apply-nav entries
    s = re.sub(r"(\('/[^']*?)\.html(', ')", r'\1\2', s)                                           # footer col tuples
    return s
files = [*PUB.rglob('*.html'), PUB/'llms.txt', PUB/'data'/'search-index.json', *(ROOT/'scripts').glob('*.py'), *(ROOT/'scripts').glob('*.js')]
for f in files:
    s = f.read_text(); o = s
    s = fix(s)
    # keep folder indexes slashed, never leave a bare "/index"
    s = s.replace('href="/"', 'href="/"')
    if s != o: f.write_text(s); n += 1
print('files changed', n)

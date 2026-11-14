#!/usr/bin/env python3
"""Puts Google's AdSense loader (the exact snippet AdSense asks for) inside <head> of every page, plus the account meta tag. Idempotent.
ads.js skips its own injection when this script tag is already present, so ads never load twice.
The publisher ID is the same one already public in ads.txt and ads.js."""
import pathlib
PUB = pathlib.Path(__file__).resolve().parent.parent / 'public'
SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6588738221262894'
SCRIPT = f'<script async src="{SRC}"\n     crossorigin="anonymous"></script>'
META = '<meta name="google-adsense-account" content="ca-pub-6588738221262894">'
n = 0
for f in sorted(PUB.rglob('*.html')):
    t = f.read_text(encoding='utf8')
    if '</head>' not in t: continue
    add = ''
    if 'google-adsense-account' not in t: add += '  ' + META + '\n'
    if SRC not in t.split('</head>')[0]: add += '  ' + SCRIPT + '\n'
    if not add: continue
    f.write_text(t.replace('</head>', add + '</head>', 1), encoding='utf8'); n += 1
print('adsense snippet added to', n, 'pages')

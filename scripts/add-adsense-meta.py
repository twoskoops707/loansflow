#!/usr/bin/env python3
"""Adds <meta name="google-adsense-account"> (Google's meta-tag verification method) to every page head. Idempotent.
The publisher ID is the same one already public in ads.txt and ads.js."""
import re, pathlib
PUB = pathlib.Path(__file__).resolve().parent.parent / 'public'
TAG = '<meta name="google-adsense-account" content="ca-pub-6588738221262894">'
n = 0
for f in PUB.rglob('*.html'):
    t = f.read_text(encoding='utf8')
    if 'google-adsense-account' in t or '</head>' not in t: continue
    t = re.sub(r'(<meta name="viewport"[^>]*>)', r'\1\n  ' + TAG, t, count=1) if '<meta name="viewport"' in t else t.replace('</head>', '  ' + TAG + '\n</head>', 1)
    f.write_text(t, encoding='utf8'); n += 1
print('adsense meta added to', n, 'pages')

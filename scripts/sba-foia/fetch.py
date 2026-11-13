#!/usr/bin/env python3
"""Download SBA's public 7(a) FOIA loan-level CSVs.

Source: https://data.sba.gov/dataset/7a-504-foia  (publisher: U.S. SBA; license: U.S. Government Works / public domain;
updated quarterly, roughly one month after quarter end).
The dataset page is read every run and the CSV links on it are taken as-is, so when SBA publishes a new quarter
(a new filename such as ..._asof_261231.csv) this picks it up automatically and old cached files for that segment are replaced.
Files go to data-cache/sba-foia/ (git-ignored; they are ~100-200 MB each).
Usage: python3 scripts/sba-foia/fetch.py [--all]   (default: 7(a) files only; --all adds the 504 files)
"""
import re, sys, os, urllib.request, pathlib
PAGE = 'https://data.sba.gov/dataset/7a-504-foia'
ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE = ROOT / 'data-cache' / 'sba-foia'
UA = {'User-Agent': 'Mozilla/5.0 (LoansFlow data pipeline; contact via site)'}

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120)

def main():
    want_504 = '--all' in sys.argv
    html = get(PAGE).read().decode('utf8', 'replace')
    links = sorted(set(re.findall(r'https://data\.sba\.gov/sites/default/files/uploaded_resources/(FOIA_[A-Za-z0-9_]+?_asof_\d{6}\.csv)', html)))
    if not links: sys.exit('No CSV links found on the dataset page; the page layout may have changed.')
    CACHE.mkdir(parents=True, exist_ok=True)
    for name in links:
        if name.startswith('FOIA_504') and not want_504: continue
        seg = re.sub(r'_asof_\d{6}\.csv$', '', name)
        for old in CACHE.glob(seg + '_asof_*.csv'):
            if old.name != name: old.unlink(); print('removed superseded', old.name)
        dest = CACHE / name
        if dest.exists() and dest.stat().st_size > 0: print('have', name); continue
        print('downloading', name, flush=True)
        tmp = dest.with_suffix('.part')
        with get('https://data.sba.gov/sites/default/files/uploaded_resources/' + name) as r, open(tmp, 'wb') as f:
            while True:
                b = r.read(1 << 20)
                if not b: break
                f.write(b)
        os.replace(tmp, dest)
    print('cache:', CACHE)

if __name__ == '__main__': main()

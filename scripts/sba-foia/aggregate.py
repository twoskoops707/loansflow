#!/usr/bin/env python3
"""Aggregate SBA 7(a) FOIA loan-level CSVs (data-cache/sba-foia/) into public/data/sba-7a-foia.json.

Only aggregates are published: no borrower names, addresses or any individual loan.
Definitions (also written into the JSON so pages can quote them):
  * A "loan" is any 7(a) approval row in the file, including loans later cancelled (LoanStatus CANCLD). SBA's own
    published approval totals include them; the cancelled count and share are reported separately per fiscal year.
  * Dollars are GrossApproval (the full approved amount, not just the SBA-guaranteed share), in nominal dollars.
  * State = ProjectState (where the financed project is located). Industry = first 2 digits of NaicsCode.
  * A median is published only for groups with at least MIN_N loans.
Run: python3 -I scripts/sba-foia/aggregate.py
"""
import glob, json, re, sys, pathlib, datetime
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE = ROOT / 'data-cache' / 'sba-foia'
OUT = ROOT / 'public' / 'data' / 'sba-7a-foia.json'
MIN_N = 20
FIRST_FY = 2000
COLS = ['AsOfDate', 'GrossApproval', 'SBAGuaranteedApproval', 'ApprovalFY', 'InitialInterestRate', 'FixedorVariableInterestInd',
        'TermInMonths', 'NaicsCode', 'ProjectState', 'LoanStatus', 'BankName']
STATES = {'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
          'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
          'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
          'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
          'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon',
          'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
          'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
          'PR': 'Puerto Rico', 'GU': 'Guam', 'VI': 'U.S. Virgin Islands', 'AS': 'American Samoa', 'MP': 'Northern Mariana Islands'}
# NAICS 2-digit sector titles (U.S. Census Bureau NAICS)
SECTORS = {'11': 'Agriculture, Forestry, Fishing and Hunting', '21': 'Mining, Quarrying, and Oil and Gas Extraction', '22': 'Utilities', '23': 'Construction',
           '31-33': 'Manufacturing', '42': 'Wholesale Trade', '44-45': 'Retail Trade', '48-49': 'Transportation and Warehousing', '51': 'Information',
           '52': 'Finance and Insurance', '53': 'Real Estate and Rental and Leasing', '54': 'Professional, Scientific, and Technical Services',
           '55': 'Management of Companies and Enterprises', '56': 'Administrative and Support and Waste Management Services', '61': 'Educational Services',
           '62': 'Health Care and Social Assistance', '71': 'Arts, Entertainment, and Recreation', '72': 'Accommodation and Food Services',
           '81': 'Other Services (except Public Administration)', '92': 'Public Administration'}

def sector(code):
    c = str(code)[:2]
    return '31-33' if c in ('31', '32', '33') else '44-45' if c in ('44', '45') else '48-49' if c in ('48', '49') else c

def load():
    files = sorted(glob.glob(str(CACHE / 'FOIA_7a_*_asof_*.csv')))
    if not files: sys.exit('No cached files. Run scripts/sba-foia/fetch.py first.')
    parts, names = [], []
    for f in files:
        head = pd.read_csv(f, nrows=0).columns
        use = [c for c in COLS if c in head]
        missing = set(COLS) - set(use)
        if missing: sys.exit(f'{f}: missing columns {missing}')
        d = pd.read_csv(f, dtype=str, usecols=use)
        parts.append(d); names.append(pathlib.Path(f).name)
    return pd.concat(parts, ignore_index=True), names

def stats(g, with_median=True):
    n = int(len(g)); amt = g['gross']
    o = {'n': n, 'usd': round(float(amt.sum()))}
    o['avg'] = round(float(amt.mean())) if n else None
    o['med'] = round(float(amt.median())) if with_median and n >= MIN_N else None
    return o

def main():
    df, names = load()
    df['gross'] = pd.to_numeric(df['GrossApproval'], errors='coerce')
    df['guar'] = pd.to_numeric(df['SBAGuaranteedApproval'], errors='coerce')
    df['fy'] = pd.to_numeric(df['ApprovalFY'], errors='coerce')
    df['rate'] = pd.to_numeric(df['InitialInterestRate'], errors='coerce')
    df['term'] = pd.to_numeric(df['TermInMonths'], errors='coerce')
    total_rows = len(df)
    df = df[df['gross'].notna() & df['fy'].notna()]
    df['fy'] = df['fy'].astype(int)
    df = df[df['fy'] >= FIRST_FY]
    df['cancelled'] = df['LoanStatus'].str.strip() == 'CANCLD'
    cancelled = int(df['cancelled'].sum())
    df['state'] = df['ProjectState'].str.strip().str.upper()
    df['sec'] = df['NaicsCode'].fillna('').map(sector)
    as_of = max(df['AsOfDate'].dropna())
    last_fy = int(df['fy'].max())
    out = {'meta': {
        'source': 'U.S. Small Business Administration, 7(a) & 504 FOIA data',
        'sourceUrl': 'https://data.sba.gov/dataset/7a-504-foia',
        'license': 'U.S. Government Works (public domain)',
        'asOf': as_of, 'generated': datetime.date.today().isoformat(), 'files': names,
        'rowsRead': int(total_rows), 'cancelledIncluded': cancelled, 'firstFY': FIRST_FY, 'latestFY': last_fy,
        'minGroupForMedian': MIN_N,
        'definitions': {
            'loan': 'Any 7(a) approval record in the file, including loans later cancelled (CANCLD), matching how SBA reports approvals. Cancelled counts are shown separately.',
            'dollars': 'GrossApproval, the full approved amount in nominal dollars (not adjusted for inflation).',
            'fiscalYear': 'Federal fiscal year, October 1 through September 30, as recorded in ApprovalFY.',
            'state': 'ProjectState, the state where the financed project is located.',
            'industry': 'First two digits of the NAICS code on the loan record, grouped into NAICS sectors.'}},
        'sectors': SECTORS, 'stateNames': STATES}
    # nationwide by fiscal year
    yrs = []
    for fy, g in df.groupby('fy'):
        s = stats(g)
        s['fy'] = int(fy); s['partial'] = as_of < f'{fy}-09-30'
        s['cancelledN'] = int(g['cancelled'].sum())
        s['cancelledShare'] = round(float(g['cancelled'].mean()), 4)
        s['le150k'] = round(float((g['gross'] <= 150000).mean()), 4)
        s['guarShare'] = round(float(g['guar'].sum() / g['gross'].sum()), 4) if g['gross'].sum() else None
        for k, lab in (('F', 'fixed'), ('V', 'variable')):
            h = g[g['FixedorVariableInterestInd'].str.strip().str.upper() == k]
            s[lab + 'N'] = int(len(h))
            s[lab + 'MedRate'] = round(float(h['rate'].median()), 2) if len(h) >= MIN_N and h['rate'].notna().any() else None
        s['medTermMonths'] = round(float(g['term'].median())) if g['term'].notna().any() else None
        yrs.append(s)
    out['years'] = sorted(yrs, key=lambda x: x['fy'])
    # by state and by sector: per fiscal year
    def grouped(col, keep):
        res = {}
        for (k, fy), g in df.groupby([col, 'fy']):
            if k not in keep: continue
            res.setdefault(k, {})[int(fy)] = stats(g)
        return res
    out['byState'] = grouped('state', STATES)
    out['bySector'] = grouped('sec', SECTORS)
    # last five fiscal years: top lenders (nationwide and by state) and industry mix by state
    w = df[df['fy'] > last_fy - 5].copy()
    w['bank'] = w['BankName'].fillna('').str.strip().str.replace(r'\s+', ' ', regex=True)
    w = w[w['bank'] != '']
    def top(g, n):
        r = g.groupby('bank').agg(n=('gross', 'size'), usd=('gross', 'sum')).sort_values(['n', 'usd'], ascending=False).head(n)
        return [{'name': k, 'n': int(v.n), 'usd': round(float(v.usd))} for k, v in r.iterrows()]
    out['window'] = {'fromFY': last_fy - 4, 'toFY': last_fy}
    out['lenders5y'] = top(w, 15)
    out['stateLenders5y'] = {s: top(g, 10) for s, g in w.groupby('state') if s in STATES}
    out['stateSectors5y'] = {}
    for s, g in df[df['fy'] > last_fy - 5].groupby('state'):
        if s not in STATES: continue
        r = g[g['sec'].isin(SECTORS)].groupby('sec').agg(n=('gross', 'size'), usd=('gross', 'sum'), med=('gross', 'median'))
        out['stateSectors5y'][s] = {k: {'n': int(v.n), 'usd': round(float(v.usd)), 'med': round(float(v.med)) if v.n >= MIN_N else None} for k, v in r.iterrows()}
    nat = df[(df['fy'] > last_fy - 5) & df['sec'].isin(SECTORS)].groupby('sec').agg(n=('gross', 'size'), usd=('gross', 'sum'), med=('gross', 'median'))
    out['sectors5y'] = {k: {'n': int(v.n), 'usd': round(float(v.usd)), 'med': round(float(v.med))} for k, v in nat.iterrows()}
    unknown_state = int((~df['state'].isin(STATES)).sum())
    out['meta']['rowsWithUnrecognizedState'] = unknown_state
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(',', ':')), encoding='utf8')
    print(f'wrote {OUT} ({OUT.stat().st_size//1024} KB); loans used={len(df)}, cancelled included={cancelled}, as of {as_of}')

if __name__ == '__main__': main()

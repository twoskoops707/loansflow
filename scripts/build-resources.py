#!/usr/bin/env python3
"""Builds the free downloadable templates (public/downloads/*.xlsx) and the /resources hub page.

  * SBA 7(a) application checklist: generated from public/downloads/loan-document-checklist.md (sections A-E), so the spreadsheet and the
    site's checklist guide cannot drift apart.
  * DSCR worksheet and loan-comparison worksheet: live Excel formulas; every assumption (such as the coverage a lender wants) is an input cell.
  * Acquisition due-diligence checklist: general-purpose request list.
Run: python3 scripts/build-resources.py   (idempotent)
"""
import re, json, pathlib, html, datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule, FormulaRule

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / 'public'
DL = PUB / 'downloads'
SITE = 'https://loansflow.loan'
news = json.loads((PUB / 'data' / 'market-news.json').read_text())
rates = json.loads((PUB / 'data' / 'rates.json').read_text())
asof = max(news.get('updatedAt', ''), rates.get('updatedAt', ''))[:10]
MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
asof_long = f"{MONTHS[int(asof[5:7])-1]} {int(asof[8:10])}, {asof[:4]}"

HDR = PatternFill('solid', fgColor='1F2937'); HF = Font(bold=True, color='FFFFFF')
INP = PatternFill('solid', fgColor='E8F1FF'); SEC = PatternFill('solid', fgColor='E5E7EB'); OUT = PatternFill('solid', fgColor='E9F8EF')
thin = Side(style='thin', color='C9CDD3'); BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
WRAP = Alignment(wrap_text=True, vertical='top')

def title(ws, text, sub, width_cols=6):
    ws['A1'] = text; ws['A1'].font = Font(bold=True, size=14)
    ws['A2'] = sub; ws['A2'].font = Font(italic=True, color='555555'); ws['A2'].alignment = Alignment(wrap_text=True, vertical='top')
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=width_cols); ws.row_dimensions[2].height = 46

def header(ws, row, labels):
    for i, l in enumerate(labels, 1):
        c = ws.cell(row=row, column=i, value=l); c.fill = HDR; c.font = HF; c.alignment = Alignment(wrap_text=True, vertical='center'); c.border = BORDER

def widths(ws, ws_widths):
    for i, w in enumerate(ws_widths, 1): ws.column_dimensions[chr(64 + i)].width = w

def normalize_zip(path):
    # fixed timestamps on every zip entry so rebuilding unchanged content gives byte-identical files (no daily commit noise)
    import zipfile, io
    d = (int(asof[:4]), int(asof[5:7]), int(asof[8:10]), 0, 0, 0)
    with zipfile.ZipFile(path) as z: items = [(i.filename, z.read(i.filename)) for i in z.infolist()]
    fixed = f'{asof}T00:00:00Z'.encode()
    items = [(n, re.sub(rb'(<dcterms:modified[^>]*>)[^<]*', lambda m: m.group(1) + fixed, d) if n == 'docProps/core.xml' else d) for n, d in items]
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in sorted(items):
            zi = zipfile.ZipInfo(name, d); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16; z.writestr(zi, data)
    pathlib.Path(path).write_bytes(buf.getvalue())

def stamp(wb):
    d = datetime.datetime(int(asof[:4]), int(asof[5:7]), int(asof[8:10]))
    wb.properties.created = d; wb.properties.modified = d; wb.properties.creator = 'LoansFlow'; wb.properties.lastModifiedBy = 'LoansFlow'

FOOT = f'Free template from LoansFlow ({SITE}/resources/), version {asof_long}. Educational only, not advice. LoansFlow is not a lender.'

# ---------------------------------------------------------------- 1. SBA application checklist (from the site's own checklist)
def application_checklist():
    md = (DL / 'loan-document-checklist.md').read_text(encoding='utf8')
    sections, cur = [], None
    for line in md.splitlines():
        m = re.match(r'## ([A-F])\. (.+)', line)
        if m: cur = [m.group(1) + '. ' + m.group(2).replace('&', 'and'), []]; sections.append(cur); continue
        m = re.match(r'- \[ \] (.+?) — (.+)', line)
        if m and cur: cur[1].append((m.group(1).strip(), m.group(2).strip()))
    sections = [s for s in sections if not s[0].startswith('F.')]  # mortgage extras are not part of an SBA business application
    wb = Workbook(); ws = wb.active; ws.title = 'Checklist'
    title(ws, 'SBA 7(a) loan application checklist', 'Track each document from "Not started" to "Done". Your lender will confirm which items apply to your deal and which SBA forms to use; ask for the current versions.', 6)
    header(ws, 4, ['Item', 'What it is', 'Responsible', 'Status', 'Date collected', 'Notes'])
    r = 5; first = r
    dv = DataValidation(type='list', formula1='"Not started,In progress,Done,Not applicable"', allow_blank=True); ws.add_data_validation(dv)
    for name, items in sections:
        c = ws.cell(row=r, column=1, value=name); c.font = Font(bold=True);
        for col in range(1, 7): ws.cell(row=r, column=col).fill = SEC
        r += 1
        for item, what in items:
            ws.cell(row=r, column=1, value=item).alignment = WRAP; ws.cell(row=r, column=2, value=what).alignment = WRAP
            s = ws.cell(row=r, column=4, value='Not started'); dv.add(s)
            for col in range(1, 7): ws.cell(row=r, column=col).border = BORDER
            r += 1
    last = r - 1
    ws.conditional_formatting.add(f'D{first}:D{last}', CellIsRule(operator='equal', formula=['"Done"'], fill=PatternFill('solid', bgColor='C6EFCE')))
    ws.conditional_formatting.add(f'D{first}:D{last}', CellIsRule(operator='equal', formula=['"In progress"'], fill=PatternFill('solid', bgColor='FFEB9C')))
    ws['H4'] = 'Progress'; ws['H4'].font = Font(bold=True)
    ws['H5'] = 'Items that apply'; ws['I5'] = f'=COUNTA(D{first}:D{last})-COUNTIF(D{first}:D{last},"Not applicable")'
    ws['H6'] = 'Done'; ws['I6'] = f'=COUNTIF(D{first}:D{last},"Done")'
    ws['H7'] = 'Percent complete'; ws['I7'] = '=IF(I5=0,0,I6/I5)'; ws['I7'].number_format = '0%'
    for a in ('I5', 'I6', 'I7'): ws[a].fill = OUT
    widths(ws, [44, 52, 16, 14, 16, 34, 3, 18, 12]); ws.freeze_panes = 'A5'
    ws.cell(row=last + 2, column=1, value=FOOT).font = Font(italic=True, size=9, color='666666')
    stamp(wb); wb.save(DL / 'sba-7a-application-checklist.xlsx'); normalize_zip(DL / 'sba-7a-application-checklist.xlsx')
    return sum(len(i) for _, i in sections)

# ---------------------------------------------------------------- 2. DSCR worksheet
def dscr_worksheet():
    wb = Workbook(); ws = wb.active; ws.title = 'DSCR'
    title(ws, 'DSCR worksheet: business and global', 'Blue cells are inputs; green cells are results. Add-backs only count if you can document them. Lenders differ on treatment of taxes and living expenses, so ask yours which method it uses.', 4)
    rows = [
        ('A. Business cash flow', None, None, 'sec'),
        ('Business net income (after owner pay)', 150000, 'Bottom line of the P&L', 'in'),
        ('Plus: interest expense', 20000, 'Existing debt interest', 'in'),
        ('Plus: depreciation and amortization', 25000, 'Non-cash expenses', 'in'),
        ('Plus: documented add-backs', 15000, 'One-time or personal items you can support', 'in'),
        ('Total: business cash flow before debt service', '=SUM(B5:B8)', '', 'out'),
        ('B. Debt service', None, None, 'sec'),
        ('Proposed loan amount', 750000, '', 'in'),
        ('Interest rate (yearly %)', 9.75, 'Enter 9.75 for 9.75%', 'in'),
        ('Term (years)', 10, '', 'in'),
        ('Annual payments on the proposed loan', '=-PMT(B12/100/12,B13*12,B11)*12', 'Level monthly payments x 12', 'out'),
        ('Annual payments on existing business debt', 36000, '', 'in'),
        ('Total: business debt service', '=B14+B15', '', 'out'),
        ('C. Business DSCR', None, None, 'sec'),
        ('Business DSCR', '=IF(B16=0,"n/a",B9/B16)', 'Cash flow divided by debt service', 'out'),
        ('Coverage your lender requires', 1.25, 'Ask your lender; many look for 1.25 or more', 'in'),
        ('Meets the requirement?', '=IF(B16=0,"n/a",IF(B18>=B19,"Yes","No"))', '', 'out'),
        ('Cash flow cushion above required level', '=B9-B16*B19', 'Negative means a shortfall', 'out'),
        ('D. Global cash flow (business and owner)', None, None, 'sec'),
        ('Plus: owner pay taken from the business', 90000, 'Personal income to the household', 'in'),
        ('Plus: other personal income', 40000, 'Documented only', 'in'),
        ('Less: personal income taxes', 30000, '', 'in'),
        ('Less: living expenses', 60000, '', 'in'),
        ('Total: global cash flow', '=B9+B23+B24-B25-B26', '', 'out'),
        ('Plus: personal debt payments (yearly)', 24000, 'Mortgage, auto, cards, loans', 'in'),
        ('Total: global debt service', '=B16+B28', '', 'out'),
        ('Global DSCR', '=IF(B29=0,"n/a",B27/B29)', '', 'out'),
        ('Meets the requirement?', '=IF(B29=0,"n/a",IF(B30>=B19,"Yes","No"))', '', 'out'),
    ]
    header(ws, 3, ['Line', 'Amount', 'Notes'])
    r = 4
    for label, val, note, kind in rows:
        ws.cell(row=r, column=1, value=label)
        if kind == 'sec':
            for c in range(1, 4): ws.cell(row=r, column=c).fill = SEC
            ws.cell(row=r, column=1).font = Font(bold=True)
        else:
            c = ws.cell(row=r, column=2, value=val); c.fill = INP if kind == 'in' else OUT; c.border = BORDER
            ws.cell(row=r, column=3, value=note).font = Font(color='666666', size=9)
            if isinstance(val, (int, float)) or (isinstance(val, str) and val.startswith('=')):
                c.number_format = '0.00"x"' if 'DSCR' in label or 'Coverage' in label else ('0.00' if 'rate' in label.lower() else ('0' if 'Term' in label else '$#,##0'))
        r += 1
    widths(ws, [50, 18, 56]); ws.freeze_panes = 'A4'
    ws.cell(row=r + 1, column=1, value=FOOT).font = Font(italic=True, size=9, color='666666')
    stamp(wb); wb.save(DL / 'dscr-worksheet.xlsx'); normalize_zip(DL / 'dscr-worksheet.xlsx')

# ---------------------------------------------------------------- 3. Due diligence checklist
DD = [
 ('Financial records', [
   ('Three to five years of profit and loss statements and balance sheets', 'Shows the trend, not just one good year.'),
   ('Monthly P&L for the last 24 months', 'Reveals seasonality and recent changes the annual numbers hide.'),
   ('General ledger detail for the last 12 months', 'Lets you test the add-backs and unusual entries.'),
   ('Bank statements for the last 12 to 24 months', 'Deposits should reconcile to reported revenue.'),
   ('Accounts receivable and payable aging reports', 'Old receivables may not be collectible; stretched payables can hide cash problems.'),
   ('Schedule of the owner\'s add-backs with support', 'Each adjustment to earnings needs a document behind it.'),
   ('Debt schedule and any liens', 'Know what must be paid off or assumed at closing.')]),
 ('Tax', [
   ('Business federal and state tax returns, three to five years', 'Should agree with the financial statements; differences need an explanation.'),
   ('Sales tax and payroll tax filings and balances', 'Unpaid trust-fund taxes can follow the business.'),
   ('Any notices or audits from tax authorities', 'Open issues affect price and indemnities.')]),
 ('Customers and revenue', [
   ('Revenue by customer for the last three years', 'Shows concentration: a customer above 10 to 15% of revenue is a risk to explain.'),
   ('Top customer contracts and renewal dates', 'Revenue that can leave on 30 days notice is worth less.'),
   ('Backlog, recurring revenue and churn data', 'Separates repeat revenue from one-off sales.'),
   ('Pricing history and major discounts', 'Checks whether margins are sustainable.')]),
 ('Operations and contracts', [
   ('Key supplier and vendor contracts', 'Look for change-of-ownership clauses and exclusivity.'),
   ('Lease agreement for the premises and any assignment terms', 'You need the right to take over the lease on workable terms.'),
   ('Franchise agreement, if any, and transfer approval requirements', 'Franchisor approval can be a condition of closing.'),
   ('Operations manual, processes and key systems', 'Shows how much of the business runs without the owner.'),
   ('Insurance policies and claims history for five years', 'Reveals hidden risk and the cost of coverage.')]),
 ('People', [
   ('Organization chart and employee list with pay and tenure', 'Identifies key people and the real labor cost.'),
   ('Employment agreements, non-competes and benefit plans', 'Shows obligations that transfer to you.'),
   ('Owner\'s role and hours worked', 'Determines how much replacement management will cost.')]),
 ('Legal and compliance', [
   ('Formation documents and ownership records', 'Confirms who can sell and what is being sold.'),
   ('Licenses, permits and certifications, with expiration dates', 'Some do not transfer automatically.'),
   ('Pending or threatened litigation and past settlements', 'Contingent liabilities affect price.'),
   ('Environmental reports for real estate or industrial operations', 'Cleanup liability can attach to the buyer.'),
   ('Intellectual property: trademarks, domains, software licenses', 'Confirm the business owns what it uses.')]),
 ('Assets', [
   ('Equipment list with age, condition and ownership', 'Shows near-term replacement spending.'),
   ('Inventory count and valuation method', 'Price adjustments often depend on inventory at closing.'),
   ('Real estate deeds, appraisals and rent roll, if included', 'Needed for collateral and the lender\'s review.')]),
 ('Deal structure and financing', [
   ('Letter of intent and purchase price allocation', 'Allocation affects taxes and depreciation for the buyer.'),
   ('Seller note terms, if any', 'Lenders may require it to be on standby and limit how it counts toward equity.'),
   ('Lender requirements and expected timeline', 'Start the lender conversation early.'),
   ('Transition plan: training period, non-compete, introductions', 'Protects customer and employee relationships after closing.')]),
]
def due_diligence():
    wb = Workbook(); ws = wb.active; ws.title = 'Due diligence'
    title(ws, 'Business acquisition due-diligence checklist', 'A general request list for buying a small business. Adapt it to the industry and deal, and have your CPA and attorney review what you receive.', 7)
    header(ws, 4, ['Request', 'Why it matters', 'Status', 'Date received', 'Reviewed by', 'Red flag?', 'Notes'])
    dvs = DataValidation(type='list', formula1='"Not requested,Requested,Received,Reviewed,Issue found,Not applicable"', allow_blank=True); ws.add_data_validation(dvs)
    dvf = DataValidation(type='list', formula1='"No,Yes,Follow up"', allow_blank=True); ws.add_data_validation(dvf)
    r = 5; first = r; n = 0
    for sec, items in DD:
        ws.cell(row=r, column=1, value=sec).font = Font(bold=True)
        for c in range(1, 8): ws.cell(row=r, column=c).fill = SEC
        r += 1
        for q, why in items:
            ws.cell(row=r, column=1, value=q).alignment = WRAP; ws.cell(row=r, column=2, value=why).alignment = WRAP
            dvs.add(ws.cell(row=r, column=3, value='Not requested')); dvf.add(ws.cell(row=r, column=6, value='No'))
            for c in range(1, 8): ws.cell(row=r, column=c).border = BORDER
            r += 1; n += 1
    last = r - 1
    ws.conditional_formatting.add(f'F{first}:F{last}', CellIsRule(operator='equal', formula=['"Yes"'], fill=PatternFill('solid', bgColor='FFC7CE')))
    ws.conditional_formatting.add(f'C{first}:C{last}', CellIsRule(operator='equal', formula=['"Reviewed"'], fill=PatternFill('solid', bgColor='C6EFCE')))
    ws['I4'] = 'Progress'; ws['I4'].font = Font(bold=True)
    ws['I5'] = 'Requests that apply'; ws['J5'] = f'=COUNTA(C{first}:C{last})-COUNTIF(C{first}:C{last},"Not applicable")'
    ws['I6'] = 'Reviewed'; ws['J6'] = f'=COUNTIF(C{first}:C{last},"Reviewed")'
    ws['I7'] = 'Red flags'; ws['J7'] = f'=COUNTIF(F{first}:F{last},"Yes")'
    for a in ('J5', 'J6', 'J7'): ws[a].fill = OUT
    widths(ws, [52, 54, 16, 14, 16, 12, 30, 3, 20, 10]); ws.freeze_panes = 'A5'
    ws.cell(row=last + 2, column=1, value=FOOT).font = Font(italic=True, size=9, color='666666')
    stamp(wb); wb.save(DL / 'business-acquisition-due-diligence-checklist.xlsx'); normalize_zip(DL / 'business-acquisition-due-diligence-checklist.xlsx')
    return n

# ---------------------------------------------------------------- 4. Loan comparison worksheet
def loan_comparison():
    wb = Workbook(); ws = wb.active; ws.title = 'Compare offers'
    title(ws, 'Loan offer comparison worksheet', 'Enter up to four offers (blue cells). The lenders, rates and fees shown are placeholder examples; replace them with your own quotes. Green cells calculate the payment, total interest, total fees and an estimated yearly cost (APR-style) that includes upfront fees. Use the lender\'s written quote for every input.', 5)
    header(ws, 4, ['', 'Offer 1', 'Offer 2', 'Offer 3', 'Offer 4'])
    ins = [('Lender', ['Lender A', 'Lender B', 'Lender C', ''], '@'), ('Loan type', ['SBA 7(a)', 'Conventional', 'Online lender', ''], '@'),
           ('Loan amount', [350000, 350000, 350000, None], '$#,##0'), ('Interest rate (yearly %, e.g. 9.75)', [10.5, 9.25, 14, None], '0.00'),
           ('Term (years)', [10, 7, 3, None], '0.0'), ('Upfront fees (% of loan)', [3.0, 1.0, 4.0, None], '0.00'),
           ('Other fees (dollars, e.g. legal, appraisal)', [2500, 4000, 0, None], '$#,##0'), ('Prepayment penalty or notes', ['', '', '', ''], '@')]
    r = 5
    for label, vals, fmt in ins:
        ws.cell(row=r, column=1, value=label).font = Font(bold=True)
        for j, v in enumerate(vals):
            c = ws.cell(row=r, column=2 + j, value=v); c.fill = INP; c.number_format = fmt; c.border = BORDER; c.alignment = WRAP
        r += 1
    # rows: 5 lender, 6 type, 7 amount, 8 rate, 9 term, 10 upfront %, 11 other fees, 12 notes
    calc = [
        ('Monthly payment', lambda c: f'=IF(OR({c}7="",{c}9=""),"",IF({c}8=0,{c}7/({c}9*12),-PMT({c}8/100/12,{c}9*12,{c}7)))', '$#,##0.00'),
        ('Total of all payments', lambda c: f'=IF({c}13="","",{c}13*{c}9*12)', '$#,##0'),
        ('Total interest', lambda c: f'=IF({c}14="","",{c}14-{c}7)', '$#,##0'),
        ('Total fees', lambda c: f'=IF({c}7="","",{c}7*{c}10/100+{c}11)', '$#,##0'),
        ('Total cost of borrowing (interest + fees)', lambda c: f'=IF({c}15="","",{c}15+{c}16)', '$#,##0'),
        ('Cash received after fees', lambda c: f'=IF({c}7="","",{c}7-{c}16)', '$#,##0'),
        ('Estimated yearly cost including fees', lambda c: f'=IF(OR({c}13="",{c}18<=0),"",RATE({c}9*12,-{c}13,{c}18)*12)', '0.00%'),
    ]
    r = 13
    for label, fn, fmt in calc:
        ws.cell(row=r, column=1, value=label).font = Font(bold=True)
        for j in range(4):
            c = ws.cell(row=r, column=2 + j, value=fn(chr(66 + j))); c.fill = OUT; c.number_format = fmt; c.border = BORDER
        r += 1
    ws.cell(row=r + 1, column=1, value='Lowest total cost of borrowing').font = Font(bold=True)
    ws.cell(row=r + 1, column=2, value='=IFERROR(INDEX(B5:E5,1,MATCH(MIN(B17:E17),B17:E17,0)),"")').fill = OUT
    ws.conditional_formatting.add('B17:E17', FormulaRule(formula=['AND(B17<>"",B17=MIN($B$17:$E$17))'], fill=PatternFill('solid', bgColor='C6EFCE')))
    ws.cell(row=r + 3, column=1, value='How to read it: the lowest monthly payment is not always the lowest cost; a longer term lowers the payment and raises total interest. The yearly cost line spreads upfront fees over the term, so compare it with each lender\'s stated APR. Confirm prepayment terms, balloon payments, variable-rate adjustments and personal guarantees before choosing.').alignment = WRAP
    ws.merge_cells(start_row=r + 3, start_column=1, end_row=r + 3, end_column=5); ws.row_dimensions[r + 3].height = 62
    ws.cell(row=r + 5, column=1, value=FOOT).font = Font(italic=True, size=9, color='666666')
    widths(ws, [44, 20, 20, 20, 20]); ws.freeze_panes = 'B5'
    stamp(wb); wb.save(DL / 'loan-comparison-worksheet.xlsx'); normalize_zip(DL / 'loan-comparison-worksheet.xlsx')


# ---------------------------------------------------------------- hub page
RES = [
 dict(file='sba-7a-application-checklist.xlsx', name='SBA 7(a) application checklist', fmt='Excel',
      desc='Every document and form lenders typically ask for on an SBA 7(a) application, with a status dropdown and a percent-complete tracker. Built from the same list as our checklist guide.',
      who='Borrowers preparing an SBA loan package.', link=('/guides/sba-7a-step-by-step', 'SBA 7(a) 10-step playbook')),
 dict(file='dscr-worksheet.xlsx', name='DSCR worksheet (business and global)', fmt='Excel',
      desc='Calculates business and global debt service coverage with live formulas. Change the loan, rate, term, add-backs and personal figures to see how the ratio moves, and set the coverage your lender requires.',
      who='Owners testing a loan request before they talk to a lender.', link=('/calculators/global-dscr', 'Global DSCR calculator')),
 dict(file='business-acquisition-due-diligence-checklist.xlsx', name='Business acquisition due-diligence checklist', fmt='Excel',
      desc='A request list for buying a small business, grouped by financial records, tax, customers, operations, people, legal, assets and deal structure, with a status and red-flag column for each item.',
      who='Buyers working through a purchase with their CPA and attorney.', link=('/calculators/business-acquisition', 'Business acquisition calculator')),
 dict(file='loan-comparison-worksheet.xlsx', name='Loan offer comparison worksheet', fmt='Excel',
      desc='Compare up to four offers side by side: monthly payment, total interest, total fees, cash received and an estimated yearly cost that includes upfront fees. Placeholder examples are included; replace them with your quotes.',
      who='Anyone choosing between written loan offers.', link=('/calculators/loan-payment', 'Loan payment calculator')),
 dict(file='loan-document-checklist.txt', name='Loan document checklist (printable text)', fmt='Text',
      desc='The plain-text version of our loan document checklist for SBA, commercial and mortgage loans. Print it or paste it into your own notes.',
      who='Borrowers who want a simple printable list.', link=('/guides/checklist', 'Interactive loan document checklist')),
]
def fsize(n): return f'{n/1024:.0f} KB' if n >= 1024 else f'{n} bytes'
def hub():
    shell = (PUB / 'guides' / 'sba-504.html').read_text(encoding='utf8').replace('href="../', 'href="/').replace('src="../', 'src="/')
    head = shell[:shell.index('</head>')]; mid = shell[shell.index('</head>'):shell.index('<main')]; tail = shell[shell.index('</main>'):]
    author = re.search(r'<section class="author-box">[\s\S]*?</section>', shell).group(0)
    url = SITE + '/resources/'; ttl = 'Free Loan Templates and Worksheets | LoansFlow'
    desc = 'Free downloadable loan templates: SBA application checklist, DSCR worksheet, acquisition due-diligence checklist and a loan offer comparison worksheet.'
    head = re.sub(r'<title>[\s\S]*?</title>', f'<title>{ttl}</title>', head)
    head = re.sub(r'(<meta name="description" content=")[^"]*"', lambda m: m.group(1) + desc + '"', head)
    head = re.sub(r'(<link rel="canonical" href=")[^"]*"', lambda m: m.group(1) + url + '"', head)
    head = re.sub(r'(<meta property="og:title" content=")[^"]*"', lambda m: m.group(1) + ttl + '"', head)
    head = re.sub(r'(<meta property="og:description" content=")[^"]*"', lambda m: m.group(1) + desc + '"', head)
    head = re.sub(r'(<meta property="og:url" content=")[^"]*"', lambda m: m.group(1) + url + '"', head)
    items = []
    cards = ''
    for i, r in enumerate(RES, 1):
        size = fsize((DL / r['file']).stat().st_size)
        items.append({'@type': 'ListItem', 'position': i, 'item': {'@type': 'DigitalDocument', 'name': r['name'], 'description': r['desc'], 'url': f"{SITE}/downloads/{r['file']}", 'encodingFormat': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' if r['file'].endswith('xlsx') else 'text/plain'}})
        cards += (f'<section class="res-card"><h2>{html.escape(r["name"])}</h2><p>{html.escape(r["desc"])}</p><p><strong>Best for:</strong> {html.escape(r["who"])}</p>'
                  f'<p><a class="lf-btn" href="/downloads/{r["file"]}" download>Download ({r["fmt"]}, {size})</a> &nbsp; Related: <a href="{r["link"][0]}">{html.escape(r["link"][1])}</a></p></section>\n')
    ld = [{'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'Free loan templates and worksheets', 'description': desc, 'url': url, 'mainEntity': {'@type': 'ItemList', 'itemListElement': items}},
          {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'}, {'@type': 'ListItem', 'position': 2, 'name': 'Resources'}]}]
    css = '<style>.res-card{border:1px solid var(--line-strong);background:var(--surface);padding:1.2rem 1.4rem;margin:1.2rem 0;max-width:80ch}.res-card h2{margin-top:0!important;font-size:1.15rem!important}.res-card p{max-width:none!important}</style>'
    body = f"""<p class="lf-crumbs"><a href="/">Home</a> / Resources</p>
<h1>Free loan templates and worksheets</h1>
<p class="lf-figcap">Updated {asof_long}.</p>
<div class="lf-answer"><strong>Short answer:</strong> LoansFlow offers {len(RES)} free downloads: an SBA 7(a) application checklist, a DSCR worksheet, a business acquisition due-diligence checklist, a loan offer comparison worksheet and a printable document checklist. They are Excel or text files; no sign-up is needed.</div>
<p>These are the tools Joshua Miller, CPA uses to organize a loan request. Each file opens in Excel, Google Sheets or Numbers. Blue cells are inputs you change; green cells calculate for you. They are educational templates, not lender forms, and your lender will tell you which forms and documents apply to your deal.</p>
{cards}<h2>How to use these templates</h2>
<p>Start with the application checklist to see what a lender will ask for, and set each item to Done as you collect it. Run the DSCR worksheet on the loan you plan to request, since coverage is usually the first thing a lender calculates; our <a href="/guides/dscr-cpa-view">DSCR guide</a> explains each adjustment. If you are buying a business, work through the due-diligence checklist with your CPA and attorney, and then compare written offers side by side in the loan comparison worksheet. The loan comparison uses standard level-payment math, and the DSCR worksheet follows the same method as our <a href="/calculators/dscr">DSCR calculator</a> and <a href="/methodology">methodology</a>.</p>
<p>The files were last built on {asof_long}. The application checklist is generated from the same list as our <a href="/guides/checklist">loan document checklist</a>, so the two stay in step. Found an error or want a template we do not have? <a href="/contact">Tell us</a>.</p>
<p class="updated">General information, not financial, tax or legal advice. LoansFlow is not a lender.</p>"""
    blocks = '\n'.join('<script type="application/ld+json">' + json.dumps(o) + '</script>' for o in ld)
    (PUB / 'resources').mkdir(exist_ok=True)
    (PUB / 'resources' / 'index.html').write_text(f"{head}\n{css}\n{blocks}{mid}<main id=\"main\" class=\"legal-page\">\n{body}\n{author}\n</main>\n  {tail[tail.index('<footer'):]}", encoding='utf8')

if __name__ == '__main__':
    DL.mkdir(exist_ok=True)
    n1 = application_checklist(); dscr_worksheet(); n3 = due_diligence(); loan_comparison(); hub()
    print(f'built 4 workbooks (application checklist: {n1} items; due-diligence: {n3} items), version {asof_long}')

#!/usr/bin/env python3
"""Copy fixes from the 2026-11-11 review. Idempotent; prints any phrase it could not find."""
import re, pathlib, glob
PUB = pathlib.Path(__file__).resolve().parent.parent / 'public'
miss = []
def sub(rel, a, b, regex=False, count=1):
    p = PUB / rel; s = p.read_text()
    if regex:
        n = re.sub(a, b, s, count=count, flags=re.S)
        if n == s and not re.search(a, s, re.S): miss.append((rel, a[:60]))
    else:
        if a not in s:
            if b not in s: miss.append((rel, a[:60]))
            return
        n = s.replace(a, b, count)
    p.write_text(n)
A = lambda u, t: f'<a href="{u}" target="_blank" rel="noopener noreferrer">{t}</a>'

# ---- Legal: terms governing law, privacy rewrite, disclaimer, disclosure
sub('terms.html', 'laws and you irrevocably submit to the exclusive jurisdiction of the courts in that location.', 'laws of the State of California, United States, and you irrevocably submit to the exclusive jurisdiction of the state and federal courts located in California.')
priv = '''<main id="main" class="legal-page">
    <h1>Privacy Policy</h1>
    <p><strong>Last Updated:</strong> November 11, 2026</p>
    <p>LoansFlow (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates https://loansflow.loan/ (the &ldquo;Site&rdquo;). This Privacy Policy explains what information we and our service providers collect when you use the Site, how it is used, and the choices you have.</p>
    <h2>Information We Collect</h2>
    <p><strong>Calculator Usage:</strong> All loan calculations run entirely in your web browser. We do not collect, store, or transmit the loan amounts, interest rates, or other financial data you enter into our calculators.</p>
    <p><strong>Automatically Collected Information:</strong> When you visit the Site, our hosting provider (Cloudflare) and our advertising and analytics providers may automatically collect information about your device and usage, such as your IP address, browser type, operating system, referring URLs, pages viewed, and the dates and times of your visits, through standard server logs and similar technologies.</p>
    <p><strong>Cookies:</strong> We and our advertising partners use cookies and similar technologies. Cookies are small files stored on your device that help analyze web traffic, remember preferences and serve ads. You can control cookies in your browser settings.</p>
    <p><strong>Contact form:</strong> If you contact us through the contact form, we receive the name, email address, optional phone number and message you submit. We use them only to respond to you, and we do not sell them.</p>
    <p><strong>Email updates:</strong> If you subscribe to our monthly rate update, we receive your email address and send it to our email service provider, which delivers the update. We use it only for that purpose, and every message includes a way to unsubscribe.</p>
    <p><strong>Grants search:</strong> The grants search sends the keywords and filters you choose to the public Grants.gov service so it can return results. Nothing else is sent.</p>
    <h2>Third-Party Advertising</h2>
    <p>We use Google AdSense to display advertisements on the Site. Google and its partners use cookies to serve ads based on your prior visits to this Site and other sites on the Internet.</p>
    <p>Google&rsquo;s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this Site and/or other sites. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google&rsquo;s Ads Settings</a> or <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">www.aboutads.info</a>.</p>
    <h2>Fonts, Embeds and Affiliate Links</h2>
    <p>The Site loads fonts from Google Fonts, which means your browser requests them from Google and your IP address is visible to Google. Some pages may include optional third-party embeds (for example, social media posts), which may set their own cookies. Some pages contain affiliate or sponsored links; when you click one, you leave the Site and the destination company&rsquo;s own privacy policy applies. See our <a href="/disclosure">advertising and affiliate disclosure</a>.</p>
    <h2>How We Use Your Information</h2>
    <p>We may use the information we collect to:</p>
    <ul>
      <li>Provide, operate, and maintain the Site</li>
      <li>Understand and improve how the Site is used</li>
      <li>Respond to messages and send the updates you request</li>
      <li>Display advertisements through Google AdSense</li>
    </ul>
    <h2>Your Choices and California Privacy Rights</h2>
    <p>You can opt out of personalized advertising using the links above and manage cookies in your browser. California residents may have the right to ask what personal information we hold about them and to request deletion; to make a request, <a href="/contact">contact us</a>. We do not sell the information you send us through the contact form or email sign-up.</p>
    <h2>Data Security</h2>
    <p>We use reasonable administrative and technical measures to help protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
    <h2>Children&rsquo;s Privacy</h2>
    <p>The Site is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us so that we can take appropriate action.</p>
    <h2>Changes to This Privacy Policy</h2>
    <p>We may update this Privacy Policy from time to time by posting the new version on this page and updating the &ldquo;Last Updated&rdquo; date.</p>
    <h2>Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, please use <a href="/contact">our contact page</a>.</p>
  </main>'''
p = PUB / 'privacy.html'; s = p.read_text()
s = re.sub(r'<main[\s\S]*?</main>', lambda m: priv, s, count=1); p.write_text(s)
sub('disclaimer.html', 'We do not make loans, accept loan applications, or match you with lenders', 'We do not make loans or accept loan applications. Some pages link to third-party lenders and financial companies, and we may be paid if you click through; see our advertising and affiliate disclosure')
d = PUB / 'disclosure.html'; s = d.read_text()
if 'Lenders listed in our guides' not in s:
    s = s.replace('<h2>Mortgages: no affiliate links</h2>', '<h2>Lenders listed in our guides and directory</h2>\n    <p>Some firms named in our guides and directory may also be affiliate partners. A listing does not mean we recommend the firm, and where a placement is paid we label it. Always compare several options and read each lender&rsquo;s terms.</p>\n    <h2>Mortgages: no affiliate links</h2>', 1); d.write_text(s)

# ---- Calculator index / help
for rel in ['calculators/index.html']:
    s = (PUB / rel).read_text()
    s2 = s.replace('14 free tools', '16 free tools').replace('All 14', 'All 16').replace('SBA and business 5', 'SBA and business 7').replace('SBA and business <b>5</b>', 'SBA and business <b>7</b>')
    if s2 != s: (PUB / rel).write_text(s2)
sub('guides/calculator-help.html', '<div class="lf-box" style="margin-bottom:1.2rem"><h3>SBA 504</h3>', '<div class="lf-box" style="margin-bottom:1.2rem"><h3>SBA business acquisition</h3><p><strong>You enter:</strong> Purchase price, working capital, closing costs, your equity, any seller note, loan rate and term, and the business&rsquo;s seller&rsquo;s discretionary earnings and a market salary for you.</p><p><strong>You get:</strong> Cash you bring to closing, the SBA loan, guarantee fee, payments and the debt service coverage ratio.</p><p><a href="/calculators/business-acquisition">Open the business acquisition calculator &rarr;</a></p></div><div class="lf-box" style="margin-bottom:1.2rem"><h3>SBA cash to close</h3><p><strong>You enter:</strong> Project cost, down payment, whether the guarantee fee is financed, lender fee, reports, legal and reserves.</p><p><strong>You get:</strong> The total cash needed at closing.</p><p><a href="/calculators/cash-to-close">Open the cash-to-close estimator &rarr;</a></p></div><div class="lf-box" style="margin-bottom:1.2rem"><h3>SBA 504</h3>')
sub('guides/calculator-help.html', 'The numbers you type are not sent to us or anyone else', 'The calculators make no network request with the numbers you type')

# ---- Calculator copy accuracy
sub('calculators/dscr.html', 'so the cushion is $33,064.', 'so income is $33,064 above debt service and $6,329 above the 1.25x level.')
sub('calculators/sba-equity-injection.html', 'and how seller notes can count toward it.', 'and what the SBA minimum is for each type of deal.')
sub('calculators/equipment-payment.html', 'including down payment and any end-of-term balloon.', 'including your down payment, rate and term.')
sub('calculators/home-affordability.html', 'into a price range using', 'into an estimated home price using')
sub('calculators/cash-to-close.html', '3% from $150,001 to $700,000 and 3.5% above that on the first $1 million guaranteed (FY 2027).', '3% from $150,001 to $700,000, and above $700,000 3.5% of the guaranteed portion up to $1 million plus 3.75% of any guaranteed amount over $1 million (FY 2027).')
sub('js/lf-calc.js', '3% of the guaranteed portion on loans of $150,001 to $700,000, 3.5% above that)', '3% of the guaranteed portion on loans of $150,001 to $700,000; 3.5% above that, up to $1 million guaranteed)')
sub('calculators/business-acquisition.html', 'DSCR is that figure divided by annual debt service (SBA loan plus seller note).', 'DSCR is that figure divided by annual debt service (SBA loan plus seller note). A seller note, if you enter one, is modeled at 6% over 10 years. SBA lenders must follow SBA SOP 50 10 8.1 (effective October 1, 2026), which limits how a seller note counts toward your equity, so treat that line as a planning assumption and ask your lender.')

# ---- Guides: facts
sub('guides/dscr-cpa-view.html', 'Ignoring the minimum a specific lender uses; there is no single SBA-wide DSCR, so ask the lender how it calculates it', 'Ignoring the lender&rsquo;s method and minimum. For acquisitions, SBA&rsquo;s current underwriting rules (' + A('https://www.sba.gov/document/sop-50-10-lender-development-company-loan-programs', 'SOP 50 10 8.1') + ', effective October 1, 2026) are reported by lender summaries to set a 1.25x floor for first-time buyers and 1.15x for business expansions, and to disallow projections for meeting it; confirm the current requirement with your lender')
sub('guides/dscr-cpa-view.html', 'DSCR is cash flow available for debt service divided by annual principal and interest payments. Many lenders look for at least 1.25x, but', 'DSCR is cash flow available for debt service divided by annual principal and interest payments. Many lenders look for at least 1.25x, and for SBA acquisitions that is the reported floor for first-time buyers, but')
sub('guides/dscr-cpa-view.html', 'Use the acquisition starting case: annual debt service $120,921', 'Assume annual debt service of about $120,921 for illustration', regex=False)
sub('guides/dscr-cpa-view.html', 'where annual debt service is $120,921.', 'and assume annual debt service of about $120,921 for illustration (the debt service of the acquisition calculator&rsquo;s $825,000 starting case).')
sub('guides/owner-add-backs-ebitda.html', 'Suppose the annual debt service on the acquisition is about $120,921 (the starting case in the <a href="/calculators/business-acquisition">acquisition calculator</a>).', 'Assume, for illustration, annual debt service of about $120,921 (the payment on the <a href="/calculators/business-acquisition">acquisition calculator</a>&rsquo;s $825,000 starting case; a $907,000 price would carry more).')
sub('guides/sba-504.html', 'a default on either triggers the SBA guarantee on that portion.', 'a default on either can lead to enforcement by that lender; the SBA backs only the CDC debenture, not the bank&rsquo;s first lien.')
sub('guides/sba-504.html', 'CDC/CDFIC structure', 'CDC structure', count=3)
sub('guides/sba-express-microloans-caplines.html', '<td>7(a) Express</td>', '<td>SBA Express</td>')
sub('guides/sba-express-microloans-caplines.html', 'ask your bank about 7(a) Express.', 'ask your bank about SBA Express.')
sub('guides/choosing-lender.html', 'Legacy lead-generation network across many loan types.', 'Lead-generation marketplace across many loan types (paid by lenders; may affect placement).')
sub('guides/choosing-lender.html', 'Legitimate lenders usually charge application and underwriting fees after you have agreed to terms, not before they have reviewed your file. Be suspicious of any fee paid before a commitment letter.', 'Application, appraisal and packaging fees can be normal. Be suspicious of any lender that demands an advance fee as a condition of &ldquo;guaranteeing&rdquo; approval, and ask for every fee in writing before you pay.')
sub('guides/sba-7a-step-by-step.html', 'good-faith fee estimate', 'written fee estimate')
sub('guides/loan-documents.html', 'IRS CP 575, 147C, or a recent IRS 627 letter verifying', 'IRS CP 575 or 147C letter verifying')
sub('guides/loan-documents.html', 'and cannot be altered without leaving a digital trace.', 'and are easier to share and store.')
sub('guides/index.html', 'from DSCR to guaranty fees to 10-year Treasuries.', 'from DSCR and amortization to the SBA guaranty.')
sub('guides/glossary.html', 'Rates are variable, capped by SBA rules, and terms stretch', 'Rates can be fixed or variable and are capped by SBA rules, and terms stretch')
sub('grants/index.html', 'and there is never a fee to apply.', 'and legitimate federal grants never charge a fee to apply.')
sub('grants/index.html', 'Checking the live numbers&hellip;', 'Live counts appear here when the search is available.')
sub('loans/index.html', 'Learn, calculate and apply &rarr;', 'Learn, calculate, prepare to apply &rarr;', count=20)
sub('loans/commercial-term-loan.html', 'Commonly 3 to 10 years', 'Commonly 3 to 10 years') 

# ---- Tax guide softening + C corporation
sub('guides/sba-loan-interest-tax-treatment.html', 'If the fee is amortized evenly over 10 years it adds about $788 a year', 'If the fee is amortized over 10 years it adds approximately $788 a year (the regulation uses a constant-yield method, so the exact amounts differ)')
sub('guides/sba-loan-interest-tax-treatment.html', '<li>Decide which entity will borrow, and who guarantees.</li>', '<li>Ask your CPA which entity should borrow and who should guarantee.</li>')
sub('guides/sba-loan-interest-tax-treatment.html', '<li>Set up fee amortization in your books at closing, not at year end.</li>', '<li>Ask your CPA to set up fee amortization in your books at closing, not at year end.</li>')
sub('guides/sba-loan-interest-tax-treatment.html', 'Form 1065 for a partnership.', 'Form 1065 for a partnership, Form 1120 for a C corporation.', regex=False)
sub('guides/sba-loan-interest-tax-treatment.html', 'which the IRS lists as <strong>$32 million for 2026</strong>', 'which the IRS lists as <strong>$32 million for 2026</strong> (Rev. Proc. 2025-32)')

# ---- Consistency: dates, bylines, directory naming, prime dates
for f in glob.glob(str(PUB / 'guides/*.html')) + glob.glob(str(PUB / '*.html')):
    s = pathlib.Path(f).read_text(); o = s
    s = s.replace('By the LoansFlow Editorial Team', 'By Joshua Miller, CPA')
    if s != o: pathlib.Path(f).write_text(s)
sub('guides/index.html', 'Updated October 22, 2026', 'Updated November 11, 2026', regex=False)
sub('methodology.html', 'Updated October 22, 2026', 'Updated November 11, 2026', regex=False)
sub('guides/index.html', 'SBA Office &amp; Lender Directory', 'SBA office and lender phone directory', count=5)
sub('directory/index.html', '>National directory<', '>Phone directory<')
for rel in ['loans/sba-7a.html', 'calculators/business-acquisition.html']:
    s = (PUB / rel).read_text(); s2 = s.replace('FRED DPRIME', 'FRED DPRIME').replace('October 27, 2026', 'November 6, 2026')
    if s2 != s: (PUB / rel).write_text(s2)
sub('scripts/x', 'x', 'x') if False else None
print('missed:', miss)

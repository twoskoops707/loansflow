#!/usr/bin/env node
/* Phase 2 edits for loans/sba-7a.html (idempotent via marker). */
const fs = require('fs'); const p = require('path').join(__dirname, '..', 'public', 'loans', 'sba-7a.html');
let h = fs.readFileSync(p, 'utf8');
if (h.includes('id="worked-example"')) { console.log('already applied'); process.exit(0); }
const rep = (a, b) => { if (!h.includes(a)) throw new Error('missing: ' + a.slice(0, 60)); h = h.replace(a, b); };
const INFO = 'https://www.sba.gov/document/information-notice-5000-881797-fy-2027-7a-program-fees';
const TERMS = 'https://www.sba.gov/partners/lenders/7a-loan-program/terms-conditions-eligibility';
const A = (u, t) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`;

// 3. rate paragraph: static dated fallback, no "loading…"
rep('<strong id="sr-prime">loading…</strong><span id="sr-asof-wrap"> (as of <span id="sr-asof"></span>)</span>',
    '<strong id="sr-prime">7.00%</strong><span id="sr-asof-wrap"> (as of <span id="sr-asof">October 27, 2026</span>; source: <a href="https://fred.stlouisfed.org/series/DPRIME" target="_blank" rel="noopener noreferrer">FRED DPRIME</a>)</span>');
rep('the SBA caps that spread by loan size.', `the SBA caps that spread by loan size (${A(TERMS, 'SBA terms and conditions')}).`);
const cells = ['13.50%', '13.00%', '11.50%', '10.00%']; let i = 0;
h = h.replace(/<td class="sr-max">…<\/td>/g, () => `<td class="sr-max">${cells[i++]}</td>`);

// facts table inline citations
rep('<dt>SBA guarantee</dt><dd>85% up to $150,000; 75% above that</dd>', `<dt>SBA guarantee</dt><dd>85% up to $150,000; 75% above that (${A(TERMS, 'SBA')})</dd>`);
rep('<dd>2% to 3.75% of the guaranteed portion (FY 2027)</dd>', `<dd>2% to 3.75% of the guaranteed portion (FY 2027, ${A(INFO, 'SBA Information Notice 5000-881797')})</dd>`);

// 6a. Lender Match vs Preferred Lenders, 6b. soften timelines
rep('Start with your own bank, then use SBA Lender Match or a Preferred Lender, which can approve without sending the file to the SBA.',
    'Start with your own bank. If you need help finding one, <a href="https://www.sba.gov/loans/lender-match/" target="_blank" rel="noopener noreferrer">SBA Lender Match</a> is a free matching service that passes your request to participating lenders; it is not an approval. Separately, a Preferred Lender (PLP) is a lender the SBA has delegated authority to, so it can make the credit decision itself without sending the file to the SBA.');
rep('Standard 7(a) loans over $350,000 are reviewed by the SBA in about 5 to 10 business days unless the lender has delegated authority; smaller loans move faster.',
    'If the lender does not have delegated authority, the SBA reviews the file before approval, which adds time. Review times vary by lender, loan size and how complete the package is, and the SBA does not guarantee a turnaround, so ask your lender for its own estimate.');
rep('Expect the closing to take a few weeks end to end.',
    'Closing time depends on the lender, the collateral and third-party reports (appraisal, environmental, title), so ask for a timeline in writing; weeks rather than days is a reasonable planning assumption, not an SBA-published figure.');

// 7. worked example after the rates table
const EX = `<h2 id="worked-example">Worked example: a $350,000 loan, all-in</h2>
    <p class="lf-figcap">Illustration as of November 2026, using the FY 2027 fee schedule (${A(INFO, 'SBA Information Notice 5000-881797')}) and a prime rate of 7.00% (<a href="https://fred.stlouisfed.org/series/DPRIME" target="_blank" rel="noopener noreferrer">FRED DPRIME</a>, October 27, 2026). Not an offer; your rate and fees will differ.</p>
    <ul>
      <li><strong>Loan:</strong> $350,000, 10-year term, variable rate assumed at 10.00% (prime + 3.00%, below the 11.50% cap for this size).</li>
      <li><strong>SBA guarantee fee:</strong> the SBA guarantees 75% of a loan this size, or $262,500. At the 3% tier that is a fee of <strong>$7,875</strong>. The lender pays the SBA and normally passes it to you, either in cash at closing or financed into the loan.</li>
      <li><strong>Monthly payment:</strong> about <strong>$4,625</strong> on $350,000 (about $4,729 if the fee is financed).</li>
      <li><strong>All-in cost over 10 years, fee paid in cash:</strong> about $205,033 interest + $7,875 fee = <strong>about $212,908</strong> on top of the $350,000 principal.</li>
    </ul>
    <h3>Amortization</h3>
    <p>In year one about $34,034 of the payments is interest and about $21,470 reduces principal. After 5 years the balance is about $217,690. Early payments are interest-heavy, which is why extra principal payments help most in the first years. The <a href="#calculators">calculator above</a> shows the full schedule.</p>
    <h3>DSCR check</h3>
    <p>Annual debt service is about $55,503 ($4,625 &times; 12). Lenders commonly look for a debt service coverage ratio of at least 1.25, which here means net operating income of about $69,400 or more. A business with $85,000 of net operating income would show a DSCR of about 1.53. See <a href="/guides/dscr-explained">DSCR explained</a> for how lenders calculate it.</p>
    `;
rep('<div class="ad-slot" data-ad-format="rectangle" data-ad-name="sba-7a-mid"', EX + '<div class="ad-slot" data-ad-format="rectangle" data-ad-name="sba-7a-mid"');

// 5. drop the bottom Sources list (now inline)
h = h.replace(/<h2>Sources<\/h2>\s*<ul>[\s\S]*?<\/ul>\s*/, '<p class="lf-figcap">Sources are linked inline at each figure: SBA terms and conditions, SBA Information Notice 5000-881797, and FRED DPRIME.</p>\n    ');
fs.writeFileSync(p, h); console.log('applied');

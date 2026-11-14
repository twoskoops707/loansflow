#!/usr/bin/env node
/* Writes the "Worked example" text on pages whose example depends on live data, so the prose can never disagree with the
   calculator next to it:
     - the prime rate          public/data/market-news.json (FRED DPRIME, refreshed daily)
     - SBA fees and rules      public/data/sba-policy.json
     - the math                public/js/lf-math.js (the same functions the calculators run)
   Each example uses the calculator's own starting values, so a reader can reproduce it on the page.
   Idempotent: the text lives between <!--lf-example:start--> and <!--lf-example:end--> markers.
   Run by the daily workflow after the rates refresh:  node scripts/build-worked-examples.js */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const LF = require(path.join(PUB, 'js', 'lf-math.js'));
const POL = LF.policy, P7 = POL.sba7a, P504 = POL.sba504, UF = P7.upfrontFee;
const news = JSON.parse(fs.readFileSync(path.join(PUB, 'data', 'market-news.json'), 'utf8'));
const prime = news.prime && news.prime.value > 0 && news.prime.value < 30 ? news.prime.value : null;
if (prime === null) { console.error('no valid prime rate in market-news.json; worked examples left unchanged'); process.exit(1); }

const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const long = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${M[+m[2] - 1]} ${+m[3]}, ${m[1]}` : ''; };
const usd = (n, d = 0) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (n) => n.toFixed(2) + '%';                    // 7 -> "7.00%"
const pc = (n) => String(+(+n).toFixed(3)) + '%';         // 3 -> "3%", 3.5 -> "3.5%"
const x2 = (n) => n.toFixed(2) + 'x';
const SPREAD = 3;                                          // the calculators' starting lender spread over prime
const primeAsOf = long(news.prime.asOf);
const primeNote = `Prime is the latest <a href="https://fred.stlouisfed.org/series/DPRIME" target="_blank" rel="noopener noreferrer">FRED DPRIME</a> reading${primeAsOf ? ' (' + primeAsOf + ')' : ''}; this example is recalculated when it changes.`;
const REPRO = 'These are the calculator&rsquo;s starting values, so you can reproduce them above.';
/* How the upfront fee is described for a given loan: "at 3%" inside a tier, or the two-part rate above the top tier. */
const feeRate = (loan, guaranteed) => { const t = UF.tiers.find((x) => loan <= x.upToLoan); return t ? pc(t.pctOfGuaranteed) : guaranteed <= UF.above.firstGuaranteed ? pc(UF.above.pctFirst) : `${pc(UF.above.pctFirst)} on the first ${usd(UF.above.firstGuaranteed)} guaranteed and ${pc(UF.above.pctRest)} above it`; };

const EX = {};

EX['calculators/sba-7a.html'] = () => {
  const A = 350000, Y = 10, noi = 120000, rate = prime + SPREAD, g = LF.sba7aDefaultGuaranty(A), fee = LF.sba7aFee(A, g, false), pay = LF.pmt(A, rate, Y);
  return `<p>A ${usd(A)} loan at prime ${pct(prime)} plus a ${pct(SPREAD)} spread is a ${pct(rate)} rate. Over ${Y} years the payment is ${usd(pay, 2)} and total interest is ${usd(pay * Y * 12 - A)}. The SBA guarantees ${usd(fee.guaranteed)} (${g}%), so the upfront fee at ${feeRate(A, fee.guaranteed)} is ${usd(fee.fee)}. With ${usd(noi)} of operating income, the DSCR is ${x2(LF.dscr(noi, pay * 12))}. ${REPRO} ${primeNote}</p>`;
};

EX['calculators/sba-express.html'] = () => {
  const A = 150000, Y = 10, rate = prime + SPREAD, g = POL.express.guarantyPct, fee = LF.sba7aFee(A, g, false), pay = LF.pmt(A, rate, Y), t = UF.tiers.find((x) => A <= x.upToLoan);
  return `<p>A ${usd(A)} Express loan at ${pct(rate)} (prime ${pct(prime)} plus ${pct(SPREAD)}) for ${Y} years has a payment of ${usd(pay, 2)} and ${usd(pay * Y * 12 - A)} in total interest. The guaranteed portion is ${usd(fee.guaranteed)} (${g}%), and the ${feeRate(A, fee.guaranteed)} upfront fee${t ? ' on loans of ' + usd(t.upToLoan) + ' or less' : ''} is ${usd(fee.fee)}. ${REPRO} ${primeNote}</p>`;
};

EX['calculators/line-of-credit.html'] = () => {
  const limit = 100000, drawn = 40, months = 12, rate = prime + SPREAD, r = LF.lineOfCredit(limit, rate, drawn, months);
  return `<p>A ${usd(limit)} line at prime ${pct(prime)} plus ${pct(SPREAD)} is ${pct(rate)}. If you average a ${drawn}% draw (${usd(r.avg)}), interest is ${usd(r.monthly, 2)} a month, or ${usd(r.total)} over ${months} months, and ${usd(r.available)} stays available. ${REPRO} ${primeNote}</p>`;
};

EX['calculators/business-acquisition.html'] = () => {
  const o = { price: 750000, workingCapital: 50000, closingCosts: 25000, equityPct: P7.equityInjectionMinPct, sellerNotePct: 0, ratePct: prime + SPREAD, years: 10, noteRatePct: 6, noteYears: 10, financeFee: true, sde: 260000, ownerSalary: 80000 };
  const a = LF.acquisition(o), guaranteed = a.loan * a.guaranty / 100;
  return `<p>A ${usd(o.price)} purchase with ${usd(o.workingCapital)} of working capital and ${usd(o.closingCosts)} of costs is ${usd(a.uses)} of uses. At ${o.equityPct}% equity you bring ${usd(a.equity)}. The SBA loan is about ${usd(a.base)} before the fee; at ${feeRate(a.loan, guaranteed)} of the guaranteed portion the fee is about ${usd(a.fee)}, and financing it brings the loan to about ${usd(a.loan)}. At ${pct(o.ratePct)} over ${o.years} years the payment is about ${usd(a.loanPmt)} a month (${usd(a.annualDS)} a year). With SDE of ${usd(o.sde)} and an ${usd(o.ownerSalary)} owner salary, cash flow is ${usd(a.cashFlow)} and DSCR is about ${x2(a.dscr)}. Those are the calculator&rsquo;s starting values, so you can reproduce them above. Rate shown: prime ${pct(prime)} plus ${pct(SPREAD)}; your rate will differ. ${primeNote}</p>`;
};

EX['calculators/cash-to-close.html'] = () => {
  const o = { projectCost: 700000, downPct: P7.equityInjectionMinPct, financeFee: false, lenderFeePct: 1, thirdParty: 8000, legal: 6000, prepaid: 4000, reserve: 25000 };
  const c = LF.cashToClose(o), g = LF.sba7aDefaultGuaranty(c.loan), guaranteed = c.loan * g / 100;
  return `<p>On a ${usd(o.projectCost)} project with ${o.downPct}% down, you put down ${usd(c.down)} and borrow ${usd(c.loan)}. The SBA guarantees ${g}%, or ${usd(guaranteed)}, so the fee at ${feeRate(c.loan, guaranteed)} is ${usd(c.fee)}. With a ${pc(o.lenderFeePct)} lender fee (${usd(c.lenderFee)}), ${usd(o.thirdParty)} of reports, ${usd(o.legal)} of legal and title, ${usd(o.prepaid)} of prepaid items and a ${usd(o.reserve)} reserve, the estimate is about ${usd(c.cash)} of cash to close. Those are the calculator&rsquo;s starting values, so you can reproduce them above.</p>`;
};

EX['calculators/sba-504.html'] = () => {
  const cost = 2000000, bankRate = 7.5, cdcRate = 6.5, Y = 25, noi = 260000, s = LF.sba504Structure(cost, false, false);
  const bank = LF.pmt(s.bank, bankRate, Y), cdc = LF.pmt(s.cdc, cdcRate, Y), blended = (s.bank * bankRate + s.cdc * cdcRate) / (s.bank + s.cdc);
  return `<p>A ${usd(cost)} project has a ${usd(s.bank)} bank loan at ${pc(bankRate)}, an ${usd(s.cdc)} debenture at ${pc(cdcRate)} and ${usd(s.equity)} of equity. Over ${Y} years the payments are ${usd(bank, 2)} and ${usd(cdc, 2)}, for a combined ${usd(bank + cdc, 2)} a month. The blended rate is ${pct(blended)}. With ${usd(noi)} of income the DSCR is ${x2(LF.dscr(noi, (bank + cdc) * 12))}. ${REPRO}</p>`;
};

EX['calculators/sba-equity-injection.html'] = () => {
  const a = LF.equityInjection(600000, 'acquire'), b = LF.equityInjection(2000000, '504both');
  return `<p>On a ${usd(600000)} business purchase the minimum equity is ${a.pct}%, which is ${usd(a.equity)}, leaving ${usd(a.loan)} to borrow. On a ${usd(2000000)} 504 project with both add-ons the equity would be ${b.pct}%, or ${usd(b.equity)}. ${REPRO}</p>`;
};

/* loans/sba-7a.html: the longer all-in example (fee, payment, amortization, DSCR). */
function loan7a() {
  const A = 350000, Y = 10, rate = prime + SPREAD, cap = prime + LF.sba7aMaxSpread(A), g = LF.sba7aDefaultGuaranty(A), fee = LF.sba7aFee(A, g, false);
  const pay = LF.pmt(A, rate, Y), payFin = LF.pmt(A + fee.fee, rate, Y), interest = pay * Y * 12 - A, y1 = LF.schedule(A, rate, Y).yearly[0], bal5 = LF.balanceAfter(A, rate, Y, 60);
  const ds = pay * 12, need = Math.round(ds * 1.25 / 100) * 100, noi = 85000, notice = (/information-notice-(\d+-\d+)/.exec(POL.sources.fees7a) || [])[1];
  return `<h2 id="worked-example">Worked example: a ${usd(A)} loan, all-in</h2>
    <p class="lf-figcap">Illustration using the FY ${POL.fiscalYear} fee schedule (<a href="${POL.sources.fees7a}" target="_blank" rel="noopener noreferrer">SBA Information Notice${notice ? ' ' + notice : ''}</a>) and the latest prime rate reading, ${pct(prime)} (<a href="https://fred.stlouisfed.org/series/DPRIME" target="_blank" rel="noopener noreferrer">FRED DPRIME</a>${primeAsOf ? ', ' + primeAsOf : ''}). Recalculated when prime or the fee schedule changes. Not an offer; your rate and fees will differ.</p>
    <ul>
      <li><strong>Loan:</strong> ${usd(A)}, ${Y}-year term, variable rate assumed at ${pct(rate)} (prime + ${pct(SPREAD)}, below the ${pct(cap)} cap for this size).</li>
      <li><strong>SBA guarantee fee:</strong> the SBA guarantees ${g}% of a loan this size, or ${usd(fee.guaranteed)}. At ${feeRate(A, fee.guaranteed)} of the guaranteed portion that is a fee of <strong>${usd(fee.fee)}</strong>. The lender pays the SBA and normally passes it to you, either in cash at closing or financed into the loan.</li>
      <li><strong>Monthly payment:</strong> about <strong>${usd(pay)}</strong> on ${usd(A)} (about ${usd(payFin)} if the fee is financed).</li>
      <li><strong>All-in cost over ${Y} years, fee paid in cash:</strong> about ${usd(interest)} interest + ${usd(fee.fee)} fee = <strong>about ${usd(interest + fee.fee)}</strong> on top of the ${usd(A)} principal.</li>
    </ul>
    <h3>Amortization</h3>
    <p>In year one about ${usd(y1.interest)} of the payments is interest and about ${usd(y1.principal)} reduces principal. After 5 years the balance is about ${usd(bal5)}. Early payments are interest-heavy, which is why extra principal payments help most in the first years. The <a href="#calculators">calculator above</a> shows the full schedule.</p>
    <h3>DSCR check</h3>
    <p>Annual debt service is about ${usd(ds)} (${usd(pay)} &times; 12). Lenders commonly look for a debt service coverage ratio of at least 1.25, which here means net operating income of about ${usd(need)} or more. A business with ${usd(noi)} of net operating income would show a DSCR of about ${LF.dscr(noi, ds).toFixed(2)}. See <a href="/guides/dscr-explained">DSCR explained</a> for how lenders calculate it.</p>
    `;
}

const START = '<!--lf-example:start-->', END = '<!--lf-example:end-->', MARKED = new RegExp(START + '[\\s\\S]*?' + END);
let changed = 0, problems = 0;
function save(rel, before, after) { if (/NaN|Infinity|undefined/.test(after.slice(after.indexOf(START), after.indexOf(END)))) { console.log('BAD VALUES, not written:', rel); problems++; return; } if (after !== before) { fs.writeFileSync(path.join(PUB, rel), after); changed++; } }

for (const [rel, make] of Object.entries(EX)) {
  const h = fs.readFileSync(path.join(PUB, rel), 'utf8'), blk = START + make() + END;
  let out;
  if (MARKED.test(h)) out = h.replace(MARKED, () => blk);
  else out = h.replace(/(<h2>Worked example<\/h2>\s*)<p>[\s\S]*?<\/p>/, (m, head) => head + blk);   // first run: replace the hand-written paragraph
  if (out === h && !MARKED.test(h)) { console.log('NO ANCHOR', rel); problems++; continue; }
  save(rel, h, out);
}
{
  const rel = 'loans/sba-7a.html', h = fs.readFileSync(path.join(PUB, rel), 'utf8'), blk = START + loan7a() + END;
  let out;
  if (MARKED.test(h)) out = h.replace(MARKED, () => blk);
  else out = h.replace(/<h2 id="worked-example">[\s\S]*?(?=<div class="ad-slot"[^>]*data-ad-name="sba-7a-mid")/, () => blk);
  if (out === h && !MARKED.test(h)) { console.log('NO ANCHOR', rel); problems++; } else save(rel, h, out);
}
console.log(`worked examples: ${Object.keys(EX).length + 1} pages checked, ${changed} updated (prime ${pct(prime)}${primeAsOf ? ', ' + primeAsOf : ''})${problems ? ', ' + problems + ' problems' : ''}`);
process.exit(problems ? 1 : 0);

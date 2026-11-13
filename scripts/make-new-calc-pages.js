#!/usr/bin/env node
/* Generates the six newer calculator pages from calculators/dscr.html and adds their cards to calculators/index.html.
   Worked examples are COMPUTED with lf-math.js (policy figures come from data/sba-policy.json), so they stay correct when policy changes.
   Idempotent. Run after sync-policy.js:  node scripts/make-new-calc-pages.js && node scripts/prerender-calcs.js */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const LF = require(path.join(PUB, 'js', 'lf-math.js'));
const POL = LF.policy;
const usd = (n, d = 0) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const x2 = (n) => n.toFixed(2) + 'x', pc = (n, d = 1) => n.toFixed(d) + '%';
const shell = fs.readFileSync(path.join(PUB, 'calculators', 'dscr.html'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const P = [];

/* 1 SBA guarantee fee */
{
  const g1 = LF.sba7aDefaultGuaranty(350000), a = LF.sba7aFee(350000, g1, false), g2 = LF.sba7aDefaultGuaranty(1200000), b = LF.sba7aFee(1200000, g2, false), f = POL.sba7a.upfrontFee;
  P.push({
    slug: 'sba-guarantee-fee', title: 'SBA 7(a) guarantee fee calculator', calc: 'sbafee', cat: 'sba', tag: 'SBA and business', sub: 'Upfront SBA fee, by loan size',
    desc: `Estimate the SBA 7(a) upfront guarantee fee for FY ${POL.fiscalYear}: guaranteed portion, fee tiers, waiver and whether to roll it into the loan.`,
    lede: 'See the upfront SBA guarantee fee on a 7(a) loan, who pays it, and what it adds to your cost.',
    body: `<h2>How to use it</h2><p>Enter the loan amount and the SBA guarantee percentage. The standard 7(a) guarantee is already filled in for the loan size you enter; change it for Express loans. Choose whether you qualify for the fee waiver and whether you would roll the fee into the loan or pay it in cash at closing.</p>
    <h2>How the fee is calculated</h2><p>The SBA charges the upfront fee on the <em>guaranteed portion</em> of the loan, not on the whole loan. The tier is chosen by the gross loan amount: ${f.tiers.map((t, i) => `${pc(t.pctOfGuaranteed, 0)} of the guaranteed portion for loans ${i === 0 ? 'up to' : 'from ' + usd(f.tiers[i - 1].upToLoan + 1) + ' to'} ${usd(t.upToLoan)}`).join(', ')}, and above ${usd(f.tiers[f.tiers.length - 1].upToLoan)} it is ${pc(f.above.pctFirst, 2)} of the guaranteed portion up to ${usd(f.above.firstGuaranteed)} plus ${pc(f.above.pctRest, 2)} of any guaranteed amount above that. The lender separately pays a ${pc(POL.sba7a.lenderAnnualServiceFeePct, 2)} annual service fee on the guaranteed balance and may not charge it to you. Rules are the SBA's FY ${POL.fiscalYear} fee notice, effective ${POL.effective}.</p>
    <h2>Worked example</h2><p>A ${usd(350000)} loan with the standard ${g1}% guarantee has a guaranteed portion of ${usd(a.guaranteed)}. In the ${pc(f.tiers[1].pctOfGuaranteed, 0)} tier the fee is ${usd(a.fee)}, or ${pc(a.fee / 350000 * 100, 2)} of the loan. If you roll it in, the balance becomes ${usd(350000 + a.fee)}. A ${usd(1200000)} loan at ${g2}% has a guaranteed portion of ${usd(b.guaranteed)}, so the fee is ${usd(b.fee)}, or ${pc(b.fee / 1200000 * 100, 2)} of the loan.</p>
    <h2>How to read the result</h2><p>The fee is a real cost even when a lender pays it first and passes it to you. Compare it with the interest saved by choosing a longer term or a lower rate, and ask your lender whether the fee will be financed. If you are a manufacturer, a listed food-supply-chain business or a rural business borrowing ${usd(f.waiver.maxLoan)} or less, the fee may be waived. See the <a href="/loans/sba-7a">SBA 7(a) page</a> for the full fee table and sources.</p>`,
    faq: [['Who pays the SBA guarantee fee?', 'The lender pays the upfront fee to the SBA and usually passes it to the borrower. The lender annual service fee cannot be passed on.'], ['Is the fee charged on the whole loan?', 'No. It is a percentage of the SBA-guaranteed portion, with the percentage set by the loan size.'], ['Can the fee be financed?', 'Often yes, which avoids cash at closing but means you pay interest on it. Ask your lender.']],
    related: ['sba-7a', 'sba-equity-injection', 'business-acquisition']
  });
}
/* 2 MCA */
{
  const a = LF.mcaCost(50000, 1.35, 130, 250, 0), b = LF.mcaCost(50000, 1.35, 250, 250, 0);
  P.push({
    slug: 'merchant-cash-advance-cost', title: 'Merchant cash advance true cost calculator', calc: 'mca', cat: 'credit', tag: 'Credit and equipment', sub: 'Turn a factor rate into an APR',
    desc: 'Convert a merchant cash advance factor rate into an estimated APR and total cost, with the payment per day or week.',
    lede: 'A factor rate looks small. This turns it into the yearly rate you can compare with other financing.',
    body: `<h2>How to use it</h2><p>Enter the advance amount, the factor rate from your offer, the number of payments and whether they are daily or weekly. If fees are taken out of the advance, enter them as a percentage so the calculator uses the cash you actually receive.</p>
    <h2>How it is calculated</h2><p>You repay the advance times the factor rate. A ${usd(50000)} advance at 1.35 means you repay ${usd(a.payback)}, which is ${usd(a.cost)} of cost. Because that cost is spread over many small payments, you hold the money for only part of the term. The calculator finds the rate per payment that makes all the payments equal to the cash you received, then multiplies by the number of payments in a year (250 business days or 52 weeks) to estimate an annual rate. It also shows the same rate compounded over a year.</p>
    <h2>Worked example</h2><p>A ${usd(50000)} advance at a 1.35 factor repaid in 130 daily payments costs ${usd(a.payment, 2)} a day and ${usd(a.cost)} in total, an estimated APR of about ${a.apr.toFixed(0)}%. The same factor repaid over 250 daily payments (a full year) has an estimated APR of about ${b.apr.toFixed(0)}%. The factor rate did not change, but the annualized cost did, because a shorter repayment period means a higher yearly rate for the same dollar cost.</p>
    <h2>How to read the result</h2><p>Compare the estimated APR with other options such as an SBA loan, a line of credit or an equipment loan, and compare the total dollars repaid, not just the factor. Merchant cash advances usually do not reduce what you owe if you repay early, so a quick payoff does not lower the cost. The result is an estimate for comparison, not a legal APR disclosure; see <a href="/compare/sba-vs-online-lender">SBA vs online lender</a> for how these products differ.</p>`,
    faq: [['Is a factor rate the same as an interest rate?', 'No. A factor rate is a flat multiple of the advance. The equivalent annual rate depends on how fast you repay.'], ['Why is the APR so high?', 'The cost is charged up front and repaid in small installments, so the money is outstanding for only part of the term.'], ['Does paying early save money?', 'Usually not; the payback amount is fixed. Check your agreement.']],
    related: ['loan-payment', 'line-of-credit', 'sba-7a']
  });
}
/* 3 global DSCR */
{
  const bcf = 150000 + 20000 + 25000 + 15000, bd = bcf / 110000, gcf = bcf + 90000 + 40000 - 30000 - 60000, gds = 110000 + 24000, gd = gcf / gds;
  P.push({
    slug: 'global-dscr', title: 'Global and add-back DSCR calculator', calc: 'gdscr', cat: 'sba', tag: 'SBA and business', sub: 'Business plus personal cash flow',
    desc: 'Calculate business DSCR with add-backs and global DSCR that includes owner income, taxes, living costs and personal debt.',
    lede: 'Lenders often test the business and the owner together. This shows both ratios, with add-backs.',
    body: `<h2>How to use it</h2><p>Start with the business: net income after owner pay, interest, depreciation and amortization, and any add-backs you can document. Then enter the business debt payments, including the new loan. For the global view, add the owner pay taken from the business, other personal income, personal taxes, living expenses and personal debt payments.</p>
    <h2>How it is calculated</h2><p>Business cash flow = net income + interest + depreciation and amortization + add-backs. Business DSCR = business cash flow &divide; business debt service. Global cash flow = business cash flow + owner pay + other personal income &minus; personal income taxes &minus; living expenses. Global DSCR = global cash flow &divide; (business debt service + personal debt payments). The global view matters for owner-operated businesses because the owner&rsquo;s household has to live on the same cash.</p>
    <h2>Worked example</h2><p>With net income of ${usd(150000)}, interest of ${usd(20000)}, depreciation of ${usd(25000)} and ${usd(15000)} of add-backs, business cash flow is ${usd(bcf)}. Against ${usd(110000)} of business debt service the business DSCR is ${x2(bd)}. Adding ${usd(90000)} of owner pay and ${usd(40000)} of other income, then subtracting ${usd(30000)} of taxes and ${usd(60000)} of living expenses, global cash flow is ${usd(gcf)}. With ${usd(24000)} of personal debt, total debt service is ${usd(gds)} and the global DSCR is ${x2(gd)}.</p>
    <h2>How to read the result</h2><p>Many lenders look for at least 1.25x. Add-backs only count when you can document them, and lenders differ on how they treat taxes and living expenses, so treat this as a planning tool. For the reasoning behind each adjustment read <a href="/guides/dscr-cpa-view">DSCR from a CPA&rsquo;s view</a> and <a href="/guides/owner-add-backs-ebitda">add-backs and EBITDA</a>.</p>`,
    faq: [['What is the difference between business and global DSCR?', 'Business DSCR looks only at the company. Global DSCR combines the company and the owner, including personal income, taxes, living costs and personal debt.'], ['Which add-backs are accepted?', 'Documented, non-recurring or personal items. Unsupported add-backs are usually rejected.'], ['What global DSCR do lenders want?', 'It varies, but many look for about 1.25x or more.']],
    related: ['dscr', 'business-acquisition', 'sba-equity-injection']
  });
}
/* 4 how much can I borrow */
{
  const cf = 120000 + 10000 + 15000 + 10000, room = cf / 1.25 - 36000, loan = LF.maxLoan(room, 9.75, 10), l15 = LF.maxLoan(cf / 1.15 - 36000, 9.75, 10);
  P.push({
    slug: 'how-much-can-i-borrow', title: 'How much business loan can I afford?', calc: 'affordloan', cat: 'credit', tag: 'Credit and equipment', sub: 'Borrowing capacity from your P&L',
    desc: 'Estimate the largest business loan your profit and loss statement can support at the coverage ratio lenders want.',
    lede: 'Start from your profit and loss statement and work backward to the largest loan the cash flow can carry.',
    body: `<h2>How to use it</h2><p>Enter net income, interest expense, depreciation and amortization, and documented add-backs from your P&amp;L, plus the yearly payments on debt you already have. Set the coverage ratio you expect the lender to require, the interest rate and the term.</p>
    <h2>How it is calculated</h2><p>Cash flow before debt = net income + interest + depreciation and amortization + add-backs. Lenders want that cash flow to cover payments by a margin, so the most you can pay in a year is cash flow &divide; the required ratio. Subtract your existing yearly debt payments and what is left is the room for a new loan. The largest loan is the amount whose level monthly payments, at your rate and term, fit in that room. The table also shows the answer at other coverage ratios.</p>
    <h2>Worked example</h2><p>With ${usd(120000)} of net income, ${usd(10000)} of interest, ${usd(15000)} of depreciation and ${usd(10000)} of add-backs, cash flow is ${usd(cf)}. At 1.25x coverage the maximum yearly payments are ${usd(cf / 1.25)}. After ${usd(36000)} of existing payments, ${usd(room)} is left. At 9.75% over 10 years that supports a loan of about ${usd(loan)}. At 1.15x coverage the same business could carry about ${usd(l15)}, which shows how much the lender&rsquo;s required ratio matters.</p>
    <h2>How to read the result</h2><p>Treat the result as a ceiling to discuss, not an approval. Lenders also weigh collateral, credit, time in business and industry. A longer term raises the amount you can afford, but you pay more interest overall. Test a specific loan with the <a href="/calculators/dscr">DSCR calculator</a> and see <a href="/loans/sba-7a">SBA 7(a)</a> and <a href="/loans/commercial-term-loan">commercial term loan</a> requirements.</p>`,
    faq: [['What counts as cash flow?', 'Net income plus interest, depreciation and amortization, and documented add-backs.'], ['Why subtract existing debt?', 'Existing loan payments use up some of the cash flow before the new loan is considered.'], ['Is this the amount I will be approved for?', 'No. It is a planning ceiling; lenders also review credit, collateral and your industry.']],
    related: ['dscr', 'loan-payment', 'sba-7a']
  });
}
/* 5 prepayment */
{
  const q = POL.sba7a.prepayment, r = LF.sba7aPrepayFee(150000, 400000, 25, 2);
  P.push({
    slug: 'prepayment-penalty', title: 'Prepayment penalty estimator', calc: 'prepay', cat: 'credit', tag: 'Credit and equipment', sub: 'Fee and savings from paying early',
    desc: 'Estimate the SBA 7(a) prepayment fee or a custom penalty, and compare it with the interest you save by paying early.',
    lede: 'Check whether paying a loan down early triggers a fee, and whether the interest you save is worth it.',
    body: `<h2>How to use it</h2><p>Choose SBA 7(a) or another loan type. Enter the current balance, how much you want to prepay, the original term and which year of the loan you are in. For other loans, enter the penalty percentage from your note. Add the rate and years remaining to see the interest you would save.</p>
    <h2>How it is calculated</h2><p>For SBA 7(a) loans the fee applies only when the original term is ${q.minMaturityYears} years or longer, you prepay within the first ${q.windowYears} years, and the prepayment is ${q.thresholdPctOfBalance}% or more of the outstanding balance. The fee is then ${q.pctOfAmountPrepaidByYear.join('%, ')}% of the amount prepaid in years 1, 2 and 3. For other loans the fee is your percentage times the amount prepaid. Interest saved assumes you keep the same payment and finish sooner, so the calculator compares the payments left before and after the prepayment.</p>
    <h2>Worked example</h2><p>A ${usd(400000)} balance on a 25-year SBA 7(a) loan, prepaying ${usd(150000)} in year 2, is ${pc(r.share)} of the balance, so the ${r.pct}% fee applies: ${usd(r.fee)}. If the same prepayment were made in year 4, or were under ${q.thresholdPctOfBalance}% of the balance, there would be no SBA fee. Compare the fee with the interest saved shown in the calculator to decide whether to prepay now or wait.</p>
    <h2>How to read the result</h2><p>A fee that is small next to the interest saved usually favors paying early, but your own note controls. Check the prepayment clause, any lender fees and tax effects. See the <a href="/loans/sba-7a">SBA 7(a) page</a> for the rule and its source, and the <a href="/calculators/refinance-break-even">refinance break-even calculator</a> if you plan to replace the loan.</p>`,
    faq: [['Does every SBA 7(a) loan have a prepayment fee?', `No. It applies only to loans with a term of ${q.minMaturityYears} years or more, prepaid within ${q.windowYears} years, when ${q.thresholdPctOfBalance}% or more of the balance is prepaid.`], ['Is the fee on the balance or the amount prepaid?', 'On the amount prepaid.'], ['Do other loans have prepayment penalties?', 'Many do. Look for the prepayment clause in your note.']],
    related: ['refinance-break-even', 'loan-payment', 'sba-7a']
  });
}
/* 6 SDE valuation */
{
  const sde = 110000 + 70000 + 12000 + 8000 + 14000 + 6000;
  P.push({
    slug: 'business-valuation-sde', title: 'Business valuation calculator (SDE multiple)', calc: 'sde', cat: 'sba', tag: 'SBA and business', sub: 'Price a small business from SDE',
    desc: 'Estimate a small business price from seller discretionary earnings (SDE) and low, middle and high valuation multiples.',
    lede: 'Add back the owner&rsquo;s pay and one-time items to find SDE, then apply a multiple to estimate a price range.',
    body: `<h2>How to use it</h2><p>Enter net profit, the owner&rsquo;s salary and perks, interest, depreciation and amortization, and any documented one-time expenses. Then enter the low, middle and high multiples you want to test. Use multiples from comparable sales if you have them; the defaults are placeholders.</p>
    <h2>How it is calculated</h2><p>SDE = net profit + owner salary + owner perks + interest + depreciation and amortization + one-time expenses. It measures the earnings available to a single owner-operator before paying themselves. The estimated price is SDE &times; multiple. Small businesses are usually priced on SDE, while larger ones are priced on EBITDA, which does not add back an owner&rsquo;s pay.</p>
    <h2>Worked example</h2><p>A business with ${usd(110000)} of net profit, ${usd(70000)} of owner salary, ${usd(12000)} of perks, ${usd(8000)} of interest, ${usd(14000)} of depreciation and ${usd(6000)} of one-time costs has SDE of ${usd(sde)}. At 2.0x the price is ${usd(sde * 2)}, at 2.5x it is ${usd(sde * 2.5)} and at 3.0x it is ${usd(sde * 3)}. A lender will then check that the business can pay the loan after a market salary for the new operator, so run the price through the <a href="/calculators/business-acquisition">business acquisition calculator</a>.</p>
    <h2>How to read the result</h2><p>The range shows how sensitive price is to the multiple: small changes in the multiple move the price a lot. Multiples depend on industry, size, growth, customer concentration and how much of the business depends on the owner. This is a starting point for negotiation, not an appraisal. See <a href="/guides/owner-add-backs-ebitda">owner add-backs and EBITDA</a> for how buyers and lenders test each adjustment.</p>`,
    faq: [['What is SDE?', 'Seller discretionary earnings: net profit plus the owner\'s pay and perks, interest, depreciation and amortization, and one-time costs.'], ['What multiple should I use?', 'Use multiples from comparable sales in your industry and size range. The calculator\'s defaults are placeholders, not market data.'], ['SDE or EBITDA?', 'SDE is common for owner-operated small businesses; EBITDA is common for larger businesses with paid management.']],
    related: ['business-acquisition', 'cash-to-close', 'dscr']
  });
}

const titleOf = { 'sba-7a': 'SBA 7(a) loan calculator', 'sba-equity-injection': 'SBA down payment (equity injection) calculator', 'business-acquisition': 'SBA business acquisition calculator', 'loan-payment': 'Loan payment calculator', 'line-of-credit': 'Business line of credit cost calculator', 'dscr': 'DSCR calculator', 'refinance-break-even': 'Refinance break-even calculator', 'cash-to-close': 'SBA cash-to-close estimator' };
const iconRe = /<span class="lf-cc-ico">[\s\S]*?<\/span>/;
let idx = fs.readFileSync(path.join(PUB, 'calculators', 'index.html'), 'utf8');
const ico = idx.match(iconRe)[0];

for (const p of P) {
  const url = `https://loansflow.loan/calculators/${p.slug}`, t = `${p.title} | LoansFlow`;
  let h = shell.replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(p.desc)}"`).replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(t)}"`).replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(p.desc)}"`).replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`);
  h = h.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (m, body) => {
    let d; try { d = JSON.parse(body); } catch (e) { return m; }
    if (d['@graph']) { const w = d['@graph'].find((e) => e['@type'] === 'WebPage'); if (w) Object.assign(w, { '@id': url + '#webpage', url, name: t, description: p.desc });
      for (const e of d['@graph']) if (e['@type'] === 'BreadcrumbList') { e.itemListElement[e.itemListElement.length - 1].name = p.title; delete e.itemListElement[e.itemListElement.length - 1].item; } }
    else if (d['@type'] === 'WebApplication') Object.assign(d, { name: p.title, url, description: p.desc });
    else if (d['@type'] === 'FAQPage') d.mainEntity = p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }));
    return '<script type="application/ld+json">\n' + JSON.stringify(d, null, 2) + '\n</script>';
  });
  const a = h.indexOf('<p class="lf-crumbs">'), b = h.indexOf('<section class="author-box">');
  const faq = `<h2>Common questions</h2>\n    <div class="lf-faq">${p.faq.map(([q, ans]) => `<details><summary>${q}</summary><p>${ans}</p></details>`).join('')}</div>`;
  const rel = p.related.map((s) => `<li><a href="/calculators/${s}">${titleOf[s]}</a></li>`).join('') + '<li><a href="/calculators/">All calculators</a></li>';
  const body = `<p class="lf-crumbs"><a href="/">Home</a> / <a href="/calculators/">Calculators</a> / ${p.title}</p>
    <p class="lf-eyebrow">Calculator</p>
    <h1>${p.title}</h1>
    <p class="lf-lede">${p.lede}</p>
    <div data-calc="${p.calc}"><p class="lf-calc-nojs">This calculator needs JavaScript.</p></div>
    <div class="ad-slot" data-ad-format="rectangle" data-ad-name="calc-${p.slug}" style="margin:2rem 0;"></div>
    <p class="lf-figcap">Updated November 1, 2026. Math reviewed against our <a href="/methodology">methodology</a>.</p>
    ${p.body}
    ${faq}
    <h2>About this calculator</h2>
    <p>This tool runs entirely in your browser; nothing you type is sent anywhere. Results are estimates, not offers or quotes, and your lender&rsquo;s numbers will differ. See <a href="/methodology">how our numbers work</a> for the formulas and assumptions.</p>
    <h2>Related calculators</h2>
    <ul>${rel}</ul>
  `;
  h = h.slice(0, a) + body + h.slice(b);
  h = h.replace(/(<div data-calc="dscr">)/, '$1'); // safety no-op
  fs.writeFileSync(path.join(PUB, 'calculators', p.slug + '.html'), h);
  // card on the calculators index
  const card = `<a class="lf-cc" href="/calculators/${p.slug}" data-cat="${p.cat}" data-t="${esc((p.title + ' ' + p.sub + ' ' + p.desc).toLowerCase())}">${ico}<span class="lf-cc-tag">${p.tag}</span><h3>${p.title}</h3><p>${p.sub}</p><span class="lf-go">Open calculator &rarr;</span></a>`;
  idx = idx.replace(new RegExp(`<a class="lf-cc" href="/calculators/${p.slug}"[\\s\\S]*?</a>`), '');
  idx = idx.replace('</div>\n    <p class="lf-ccnone"', card + '</div>\n    <p class="lf-ccnone"');
  console.log('wrote', p.slug);
}
fs.writeFileSync(path.join(PUB, 'calculators', 'index.html'), idx);

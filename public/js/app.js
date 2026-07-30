
// ---------- STATE ----------
const state = {
  step: 0,
  homePrice: 425000,
  downPayment: 85000,
  rate: 6.75,
  term: 30,
  taxRate: 1.1,   // annual % of home price
  insurance: 1400, // annual $
  // extra / balloon payments
  extraMonthly: 0,
  balloonAmount: 0,
  balloonMonth: 12,
  // refinance
  newRate: 5.9,
  newTerm: 30,
  // affordability
  income: 95000,
  monthlyDebts: 450,
  affordDownPayment: 60000,
  affordRate: 6.75,

  // SBA / commercial loan
  bizLoanType: 'sba7a',      // 'sba7a' | 'sba504' | 'conventional'
  bizLoanAmount: 350000,
  bizPrimeRate: 6.75,
  bizSpread: 3.0,
  bizGuarantyPct: 75,
  bizAmortYears: 10,
  bizBalloonYears: 0,        // 0 = fully amortizing, else balloon due at this year
  bizNOI: 85000,               // annual net operating income, for DSCR

  // line of credit
  locLimit: 150000,
  locPrimeRate: 6.75,
  locSpread: 2.0,
  locPaymentType: 'interestOnly',  // 'interestOnly' | 'percentBalance'
  locMinPercent: 2,
  locMonths: 12,
  locDraws: [
    { id: 1, month: 1, amount: 40000 },
    { id: 2, month: 3, amount: 15000 },
    { id: 3, month: 7, amount: -20000 }
  ],
  locNextDrawId: 4
};

const steps = [
  "SBA & Commercial Loan",
  "Commercial Amortization",
  "Line of Credit",
  "Mortgage: Loan Details",
  "Mortgage: Payment Breakdown",
  "Mortgage: Amortization Ledger",
  "Mortgage: Refinance Comparison",
  "Mortgage: Affordability",
  "Market News & Rates"
];

// ---------- MATH ----------
function monthlyPI(principal, annualRatePct, years){
  const r = (annualRatePct/100)/12;
  const n = years*12;
  if(r === 0) return principal/n;
  return principal * (r*Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
}

function buildAmortization(principal, annualRatePct, years, extraMonthly=0, balloonAmount=0, balloonMonth=0){
  const r = (annualRatePct/100)/12;
  const n = years*12;
  const basePmt = monthlyPI(principal, annualRatePct, years);
  let balance = principal;
  const rows = [];
  for(let m=1; m<=n; m++){
    if(balance <= 0.005) break;
    const interest = balance*r;
    let scheduledPrincipal = basePmt - interest;
    let extra = extraMonthly + (balloonMonth && m === balloonMonth ? balloonAmount : 0);
    let totalPrincipalPaid = scheduledPrincipal + extra;

    // final payment: don't overpay past zero balance
    if(totalPrincipalPaid > balance){
      totalPrincipalPaid = balance;
    }
    balance = Math.max(0, balance - totalPrincipalPaid);
    rows.push({
      month:m,
      interest,
      principalPaid: totalPrincipalPaid,
      balance,
      pmt: interest + totalPrincipalPaid
    });
  }
  return rows;
}

function fmt(num, decimals=0){
  return num.toLocaleString('en-US', {minimumFractionDigits:decimals, maximumFractionDigits:decimals});
}
function fmtMoney(num, decimals=0){
  return '$' + fmt(num, decimals);
}

// ---------- RENDER: NAV ----------
function renderNav(){
  const nav = document.getElementById('stepNav');
  nav.innerHTML = steps.map((s,i)=>`
    <li class="step ${i===state.step?'active':''}" data-idx="${i}">
      <span class="step-no">${String(i+1).padStart(2,'0')}</span>
      <span class="step-label">${s}</span>
    </li>
  `).join('');
  nav.querySelectorAll('.step').forEach(el=>{
    el.addEventListener('click', ()=>{ state.step = parseInt(el.dataset.idx); render(); });
  });
}

// ---------- RENDER: STEP 0 â€” LOAN DETAILS ----------
function renderStep0(){
  return `
    <div class="eyebrow">Step 04 &middot; Mortgage Tools</div>
    <h1>Loan Details</h1>
    <p class="sub">Enter the basics of the property and loan. We'll calculate your monthly payment, full amortization schedule, and refinance potential from these numbers.</p>
    <div class="panel">
      <div class="field-grid">
        <div class="field">
          <label for="homePrice">Home Price</label>
          <div class="input-wrap"><span>$</span><input id="homePrice" type="number" value="${state.homePrice}" step="1000"></div>
        </div>
        <div class="field">
          <label for="downPayment">Down Payment</label>
          <div class="input-wrap"><span>$</span><input id="downPayment" type="number" value="${state.downPayment}" step="1000"></div>
        </div>
        <div class="field">
          <label for="rate">Interest Rate</label>
          <div class="input-wrap"><input id="rate" type="number" value="${state.rate}" step="0.01"><span>%</span></div>
        </div>
        <div class="field">
          <label for="term">Loan Term</label>
          <select id="term">
            <option value="30" ${state.term===30?'selected':''}>30 years</option>
            <option value="20" ${state.term===20?'selected':''}>20 years</option>
            <option value="15" ${state.term===15?'selected':''}>15 years</option>
            <option value="10" ${state.term===10?'selected':''}>10 years</option>
          </select>
        </div>
        <div class="field">
          <label for="taxRate">Annual Property Tax</label>
          <div class="input-wrap"><input id="taxRate" type="number" value="${state.taxRate}" step="0.05"><span>% of price</span></div>
        </div>
        <div class="field">
          <label for="insurance">Annual Home Insurance</label>
          <div class="input-wrap"><span>$</span><input id="insurance" type="number" value="${state.insurance}" step="50"></div>
        </div>
      </div>
      <div class="actions">
        <a href="#" onclick="event.preventDefault(); state.step=0; render();" style="align-self:center; font-size:0.85rem; color:var(--ink-soft); text-decoration:underline; margin-right:auto;">&larr; Back to SBA &amp; Commercial</a>
        <button class="btn-primary" id="toResults">Calculate Payment &rarr;</button>
      </div>
    </div>

    <div class="panel" style="margin-top:2rem;">
      <div class="article">
        <h2>How a Mortgage Payment Is Actually Calculated</h2>
        <p>Your monthly mortgage payment is usually made up of four parts, often shortened to <strong>PITI</strong>: principal, interest, taxes, and insurance. Principal is the portion that pays down the amount you borrowed. Interest is the lender's charge for lending you the money, calculated each month on whatever balance remains. Property tax and homeowners insurance are collected monthly and held in an escrow account, then paid on your behalf when the bills come due once or twice a year.</p>
        <p>In the early years of a loan, most of each payment goes toward interest rather than principal, because interest is calculated on a much larger remaining balance. As the balance shrinks, the interest portion shrinks with it and more of each payment starts paying down principal â€” this shift is what the Amortization Ledger step visualizes.</p>

        <h2>Fixed-Rate vs. Adjustable-Rate Mortgages</h2>
        <p>A <strong>fixed-rate mortgage</strong> locks in the same interest rate for the entire loan term, so the principal-and-interest portion of your payment never changes. This calculator assumes a fixed rate, which is the most common structure for 30-year and 15-year home loans in the U.S.</p>
        <p>An <strong>adjustable-rate mortgage (ARM)</strong> starts with a lower introductory rate for a set period â€” commonly 5, 7, or 10 years â€” then adjusts periodically based on a market index. ARMs can make sense for buyers who plan to sell or refinance before the adjustment period begins, but they carry more long-term uncertainty than a fixed-rate loan.</p>

        <h2>What Affects the Interest Rate You're Offered</h2>
        <ul>
          <li><strong>Credit score</strong> â€” generally the single largest factor lenders weigh</li>
          <li><strong>Down payment size</strong> â€” a larger down payment reduces the lender's risk and often earns a better rate</li>
          <li><strong>Loan term</strong> â€” shorter terms (like 15 years) typically carry lower rates than 30-year loans, since the lender's money is at risk for less time</li>
          <li><strong>Debt-to-income ratio</strong> â€” how much of your monthly income already goes to existing debt</li>
          <li><strong>Loan type</strong> â€” conventional, FHA, VA, and USDA loans each have different rate and qualification structures</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">How much down payment do I actually need?<span class="mark">+</span></div>
          <div class="faq-a">Conventional loans often allow as little as 3â€“5% down, FHA loans allow as little as 3.5%, and VA or USDA loans can allow 0% down for eligible borrowers. Putting down less than 20% on a conventional loan typically means paying private mortgage insurance (PMI) until you build enough equity.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">Why does my estimated payment differ from what a lender quotes me?<span class="mark">+</span></div>
          <div class="faq-a">This tool estimates property tax and insurance as flat percentages/annual figures you enter, while a lender's official Loan Estimate uses your specific property's actual tax assessment, your chosen insurance policy, and may include PMI, HOA dues, or a slightly different rate based on your finalized credit profile.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">Is a 15-year or 30-year mortgage better?<span class="mark">+</span></div>
          <div class="faq-a">A 15-year loan typically carries a lower interest rate and dramatically less total interest paid, but a meaningfully higher monthly payment. A 30-year loan gives more monthly breathing room at the cost of more interest over time. Try both terms in the Loan Details step to compare your actual numbers.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">What's the difference between a rate and an APR?<span class="mark">+</span></div>
          <div class="faq-a">The interest rate is what's applied to your loan balance to calculate interest. The APR (Annual Percentage Rate) also factors in certain lender fees and closing costs, spread over the loan term â€” which is why APR is usually slightly higher than the quoted rate, and is meant to help you compare offers between lenders on an apples-to-apples basis.</div>
        </div>
      </div>
    </div>
  `;
}

// ---------- RENDER: STEP 1 â€” RESULTS ----------
function renderStep1(){
  const principal = state.homePrice - state.downPayment;
  const pi = monthlyPI(principal, state.rate, state.term);
  const monthlyTax = (state.homePrice * state.taxRate/100)/12;
  const monthlyIns = state.insurance/12;
  const total = pi + monthlyTax + monthlyIns;

  const piPct = (pi/total)*100;
  const taxPct = (monthlyTax/total)*100;
  const insPct = (monthlyIns/total)*100;

  return `
    <div class="eyebrow">Step 05 &middot; Mortgage Tools</div>
    <h1>Payment Breakdown</h1>
    <p class="sub">Your estimated total monthly payment, split into principal &amp; interest, taxes, and insurance.</p>
    <div class="panel">
      <div class="headline-figure">
        <div class="label">Estimated Monthly Payment</div>
        <div class="value">${fmtMoney(total,0)}<small> / month</small></div>
      </div>
      <div class="breakdown">
        <div class="bar">
          <div class="seg" style="width:${piPct}%; background:var(--principal);"></div>
          <div class="seg" style="width:${taxPct}%; background:var(--gold);"></div>
          <div class="seg" style="width:${insPct}%; background:var(--interest);"></div>
        </div>
        <div class="legend">
          <div class="legend-item"><span class="swatch" style="background:var(--principal);"></span>Principal &amp; Interest</div>
          <div class="legend-item"><span class="swatch" style="background:var(--gold);"></span>Property Tax</div>
          <div class="legend-item"><span class="swatch" style="background:var(--interest);"></span>Home Insurance</div>
        </div>

        <div class="line-item"><span>Principal &amp; Interest</span><span class="num">${fmtMoney(pi,2)}</span></div>
        <div class="line-item"><span>Property Tax (est.)</span><span class="num">${fmtMoney(monthlyTax,2)}</span></div>
        <div class="line-item"><span>Home Insurance (est.)</span><span class="num">${fmtMoney(monthlyIns,2)}</span></div>
        <div class="line-item"><span>Total Monthly Payment</span><span class="num">${fmtMoney(total,2)}</span></div>

        <div class="ad-slot" data-ad-format="horizontal" data-ad-name="calc-top"></div>

        <div class="line-item"><span>Loan Amount</span><span class="num">${fmtMoney(principal,0)}</span></div>
        <div class="line-item"><span>Total Interest Paid (${state.term} yrs)</span><span class="num">${fmtMoney(pi*state.term*12 - principal,0)}</span></div>
      </div>
      <div class="actions">
        <button class="btn-ghost" id="backTo0">&larr; Back</button>
        <button class="btn-primary" id="toAmort">View Amortization Ledger &rarr;</button>
      </div>
    </div>
  `;
}

// ---------- RENDER: STEP 2 â€” AMORTIZATION ----------
function renderStep2(){
  const principal = state.homePrice - state.downPayment;

  // baseline schedule (no extra/balloon payments) for comparison
  const baseRows = buildAmortization(principal, state.rate, state.term);
  const baseInterest = baseRows.reduce((s,r)=>s+r.interest,0);
  const baseMonths = baseRows.length;

  // actual schedule with any extra/balloon payments applied
  const rows = buildAmortization(
    principal, state.rate, state.term,
    state.extraMonthly, state.balloonAmount, state.balloonMonth
  );
  const actualInterest = rows.reduce((s,r)=>s+r.interest,0);
  const actualMonths = rows.length;

  const interestSaved = baseInterest - actualInterest;
  const monthsSaved = baseMonths - actualMonths;
  const hasExtra = state.extraMonthly > 0 || state.balloonAmount > 0;

  // group by year for the summary strip â€” uses actual (possibly shortened) schedule
  const yearsActual = Math.ceil(rows.length/12);
  let yearRows = [];
  for(let y=0; y<yearsActual; y++){
    const slice = rows.slice(y*12, y*12+12);
    if(slice.length === 0) continue;
    const yrPrincipal = slice.reduce((s,r)=>s+r.principalPaid,0);
    const yrInterest = slice.reduce((s,r)=>s+r.interest,0);
    const endBalance = slice[slice.length-1].balance;
    yearRows.push({year:y+1, yrPrincipal, yrInterest, endBalance});
  }

  const tableRows = yearRows.map(yr=>{
    const total = yr.yrPrincipal + yr.yrInterest;
    const pPct = total>0 ? (yr.yrPrincipal/total)*100 : 0;
    return `
      <tr>
        <td>
          <span class="yr-strip"><span style="width:${pPct}%; background:var(--principal); float:left;"></span><span style="width:${100-pPct}%; background:var(--interest); float:left;"></span></span>
          Year ${yr.year}
        </td>
        <td>${fmtMoney(yr.yrPrincipal,0)}</td>
        <td>${fmtMoney(yr.yrInterest,0)}</td>
        <td>${fmtMoney(yr.endBalance,0)}</td>
      </tr>
    `;
  }).join('');

  const payoffYears = Math.floor(actualMonths/12);
  const payoffMonthsRem = actualMonths % 12;

  return `
    <div class="eyebrow">Step 06 &middot; Mortgage Tools</div>
    <h1>Amortization Ledger</h1>
    <p class="sub">How each payment splits between principal and interest over the life of the loan â€” and how your remaining balance shrinks year by year.</p>

    <div class="panel">
      <div class="field-grid">
        <div class="field">
          <label for="extraMonthly">Extra Monthly Payment</label>
          <div class="input-wrap"><span>$</span><input id="extraMonthly" type="number" value="${state.extraMonthly}" step="25"></div>
        </div>
        <div class="field"><!-- spacer --></div>
        <div class="field">
          <label for="balloonAmount">One-Time Balloon Payment</label>
          <div class="input-wrap"><span>$</span><input id="balloonAmount" type="number" value="${state.balloonAmount}" step="500"></div>
        </div>
        <div class="field">
          <label for="balloonMonth">Applied in Month #</label>
          <div class="input-wrap"><input id="balloonMonth" type="number" value="${state.balloonMonth}" min="1" max="${state.term*12}" step="1"></div>
        </div>
      </div>

      ${hasExtra ? `
      <div class="savings-callout" style="margin:0 2rem 1.5rem;">
        <div class="label">Payoff In ${payoffYears} yr${payoffMonthsRem?' '+payoffMonthsRem+' mo':''} â€” vs. ${state.term} yr Original</div>
        <div class="value">${fmtMoney(interestSaved,0)} interest saved${monthsSaved>0 ? ' &middot; '+monthsSaved+' months earlier' : ''}</div>
      </div>
      ` : ''}

      <div class="ad-slot" data-ad-format="rectangle" data-ad-name="calc-mid"></div>

      <div class="ledger-table-wrap">
        <table>
          <thead>
            <tr><th>Year</th><th>Principal Paid</th><th>Interest Paid</th><th>Remaining Balance</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <div class="actions">
        <button class="btn-ghost" id="backTo1">&larr; Back</button>
        <button class="btn-primary" id="toRefi">Compare Refinance Options &rarr;</button>
      </div>
    </div>
  `;
}

// ---------- RENDER: STEP 3 â€” REFINANCE ----------
function renderStep3(){
  const principal = state.homePrice - state.downPayment;
  const currentPI = monthlyPI(principal, state.rate, state.term);
  const newPI = monthlyPI(principal, state.newRate, state.newTerm);
  const monthlySavings = currentPI - newPI;
  const lifetimeCurrent = currentPI*state.term*12;
  const lifetimeNew = newPI*state.newTerm*12;
  const lifetimeSavings = lifetimeCurrent - lifetimeNew;

  return `
    <div class="eyebrow">Step 07 &middot; Mortgage Tools</div>
    <h1>Refinance Comparison</h1>
    <p class="sub">See how a different rate or term changes your monthly payment and total interest paid over the life of the loan.</p>
    <div class="panel">
      <div class="field-grid" style="padding-bottom:0;">
        <div class="field">
          <label for="newRate">New Interest Rate</label>
          <div class="input-wrap"><input id="newRate" type="number" value="${state.newRate}" step="0.01"><span>%</span></div>
        </div>
        <div class="field">
          <label for="newTerm">New Loan Term</label>
          <select id="newTerm">
            <option value="30" ${state.newTerm===30?'selected':''}>30 years</option>
            <option value="20" ${state.newTerm===20?'selected':''}>20 years</option>
            <option value="15" ${state.newTerm===15?'selected':''}>15 years</option>
          </select>
        </div>
      </div>

      <div class="compare-grid">
        <div class="compare-col">
          <h3>Current Loan</h3>
          <div class="compare-row"><span>Rate</span><span class="num">${state.rate}%</span></div>
          <div class="compare-row"><span>Term</span><span class="num">${state.term} yrs</span></div>
          <div class="compare-row"><span>Monthly P&amp;I</span><span class="num">${fmtMoney(currentPI,2)}</span></div>
          <div class="compare-row"><span>Lifetime Interest</span><span class="num">${fmtMoney(lifetimeCurrent-principal,0)}</span></div>
        </div>
        <div class="compare-col new">
          <h3>Refinanced Loan</h3>
          <div class="compare-row"><span>Rate</span><span class="num">${state.newRate}%</span></div>
          <div class="compare-row"><span>Term</span><span class="num">${state.newTerm} yrs</span></div>
          <div class="compare-row"><span>Monthly P&amp;I</span><span class="num">${fmtMoney(newPI,2)}</span></div>
          <div class="compare-row"><span>Lifetime Interest</span><span class="num">${fmtMoney(lifetimeNew-principal,0)}</span></div>
        </div>
      </div>

      <div class="savings-callout">
        <div class="label">Estimated Monthly Savings</div>
        <div class="value">${monthlySavings >= 0 ? fmtMoney(monthlySavings,2)+' / month' : '&minus;'+fmtMoney(Math.abs(monthlySavings),2)+' / month'}</div>
      </div>

      <div class="ad-slot" data-ad-format="auto" data-ad-name="calc-auto"></div>

      <div class="actions" style="padding-top:0;">
        <button class="btn-ghost" id="backTo2">&larr; Back</button>
        <button class="btn-primary" id="toAfford">Check Affordability &rarr;</button>
      </div>
    </div>
  `;
}

// ---------- RENDER: STEP 4 â€” AFFORDABILITY ----------
function renderStep4(){
  const monthlyIncome = state.income/12;
  const maxHousingPayment = monthlyIncome * 0.28; // front-end DTI guideline
  const maxTotalDebtPayment = monthlyIncome * 0.36 - state.monthlyDebts; // back-end
  const maxPayment = Math.max(0, Math.min(maxHousingPayment, maxTotalDebtPayment + maxHousingPayment*0));
  // solve for max principal given maxHousingPayment as P&I budget (roughly, ignoring tax/ins split for simplicity here)
  const r = (state.affordRate/100)/12;
  const n = 30*12;
  const budgetForPI = Math.min(maxHousingPayment, monthlyIncome*0.36 - state.monthlyDebts);
  const maxPrincipal = budgetForPI * (Math.pow(1+r,n)-1) / (r*Math.pow(1+r,n));
  const maxHomePrice = Math.max(0, maxPrincipal + state.affordDownPayment);

  const currentDebtToIncome = ((state.monthlyDebts + budgetForPI) / monthlyIncome) * 100;
  const dtiColor = currentDebtToIncome > 43 ? 'var(--danger)' : currentDebtToIncome > 36 ? 'var(--gold)' : 'var(--principal)';

  return `
    <div class="eyebrow">Step 08 &middot; Mortgage Tools</div>
    <h1>Affordability Calculator</h1>
    <p class="sub">Based on your income and existing debts, here's an estimate of how much home you could afford.</p>
    <div class="panel">
      <div class="field-grid">
        <div class="field">
          <label for="income">Annual Household Income</label>
          <div class="input-wrap"><span>$</span><input id="income" type="number" value="${state.income}" step="1000"></div>
        </div>
        <div class="field">
          <label for="monthlyDebts">Other Monthly Debt Payments</label>
          <div class="input-wrap"><span>$</span><input id="monthlyDebts" type="number" value="${state.monthlyDebts}" step="10"></div>
        </div>
        <div class="field">
          <label for="affordDownPayment">Available Down Payment</label>
          <div class="input-wrap"><span>$</span><input id="affordDownPayment" type="number" value="${state.affordDownPayment}" step="1000"></div>
        </div>
        <div class="field">
          <label for="affordRate">Assumed Interest Rate</label>
          <div class="input-wrap"><input id="affordRate" type="number" value="${state.affordRate}" step="0.01"><span>%</span></div>
        </div>
      </div>

      <div class="afford-result">
        <div class="label" style="font-family:'IBM Plex Mono',monospace; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--ink-soft); margin-bottom:0.4rem;">Estimated Home Price You Could Afford</div>
        <div class="value">${fmtMoney(maxHomePrice,0)}</div>
        <div class="dti-bar"><div class="fill" style="width:${Math.min(currentDebtToIncome,100)}%; background:${dtiColor};"></div></div>
        <div class="dti-note">Estimated debt-to-income ratio: ${currentDebtToIncome.toFixed(1)}% (lenders typically look for 36% or below, up to 43% for some loan types)</div>
      </div>

      <div class="ad-slot" data-ad-format="fluid" data-ad-name="calc-article"></div>

      <div class="actions" style="padding-top:0;">
        <button class="btn-ghost" id="backTo3">&larr; Back</button>
        <button class="btn-primary" id="toStart">Start a New Calculation &rarr;</button>
      </div>
    </div>
  `;
}

function estimateSbaGuarantyFee(loanAmount, guarantyPct){
  const guaranteedPortion = loanAmount * (guarantyPct/100);
  // Illustrative FY tranche schedule for 7(a) loans w/ maturity > 12 months
  // (standard, non-manufacturer, non-veteran). Confirm exact figure with lender.
  let feePct;
  if(guaranteedPortion <= 150000){
    feePct = 2.0;
  } else if(guaranteedPortion <= 700000){
    feePct = 3.0;
  } else if(guaranteedPortion <= 1000000){
    feePct = 3.5;
  } else {
    feePct = 3.75;
  }
  return { fee: guaranteedPortion * (feePct/100), feePct, guaranteedPortion };
}

// ---------- RENDER: STEP 5 â€” SBA & COMMERCIAL LOAN ----------
function renderStep5(){
  const rate = state.bizPrimeRate + state.bizSpread;
  const pi = monthlyPI(state.bizLoanAmount, rate, state.bizAmortYears);
  const annualDebtService = pi*12;
  const dscr = state.bizNOI / annualDebtService;

  const isSba = state.bizLoanType === 'sba7a' || state.bizLoanType === 'sba504';
  const guarantyInfo = isSba ? estimateSbaGuarantyFee(state.bizLoanAmount, state.bizGuarantyPct) : null;
  const annualServiceFee = isSba ? state.bizLoanAmount*(state.bizGuarantyPct/100)*0.0055 : 0;

  // balloon handling â€” reuse the amortization engine
  let balloonBalance = null;
  if(state.bizBalloonYears > 0 && state.bizBalloonYears < state.bizAmortYears){
    const fullSchedule = buildAmortization(state.bizLoanAmount, rate, state.bizAmortYears);
    const idx = state.bizBalloonYears*12 - 1;
    balloonBalance = fullSchedule[Math.min(idx, fullSchedule.length-1)].balance;
  }

  const dscrColor = dscr >= 1.25 ? 'var(--principal)' : dscr >= 1.0 ? 'var(--gold)' : 'var(--danger)';
  const dscrNote = dscr >= 1.25
    ? 'Meets the typical 1.25x DSCR threshold most SBA and commercial lenders require.'
    : dscr >= 1.0
    ? 'Below the typical 1.25x lender threshold â€” approval may require additional collateral or a lower loan amount.'
    : 'Below 1.0x â€” the business is not generating enough net income to cover this debt service as structured.';

  return `
    <div class="eyebrow">Step 01</div>
    <h1>SBA &amp; Commercial Loan Calculator</h1>
    <p class="sub">Estimate payment, guaranty fees, and debt service coverage for an SBA 7(a), SBA 504, or conventional commercial term loan.</p>

    <div class="panel">
      <div class="field-grid" style="padding-bottom:0.5rem;">
        <div class="field full">
          <label for="bizLoanType">Loan Type</label>
          <select id="bizLoanType">
            <option value="sba7a" ${state.bizLoanType==='sba7a'?'selected':''}>SBA 7(a)</option>
            <option value="sba504" ${state.bizLoanType==='sba504'?'selected':''}>SBA 504</option>
            <option value="conventional" ${state.bizLoanType==='conventional'?'selected':''}>Conventional Commercial</option>
          </select>
        </div>
        <div class="field">
          <label for="bizLoanAmount">Loan Amount</label>
          <div class="input-wrap"><span>$</span><input id="bizLoanAmount" type="number" value="${state.bizLoanAmount}" step="5000"></div>
        </div>
        <div class="field">
          <label for="bizAmortYears">Amortization</label>
          <div class="input-wrap"><input id="bizAmortYears" type="number" value="${state.bizAmortYears}" min="1" max="25" step="1"><span>years</span></div>
        </div>
        <div class="field">
          <label for="bizPrimeRate">Prime Rate</label>
          <div class="input-wrap"><input id="bizPrimeRate" type="number" value="${state.bizPrimeRate}" step="0.01"><span>%</span></div>
        </div>
        <div class="field">
          <label for="bizSpread">Lender Spread</label>
          <div class="input-wrap"><input id="bizSpread" type="number" value="${state.bizSpread}" step="0.05"><span>%</span></div>
        </div>
        <div class="field">
          <label for="bizGuarantyPct">SBA Guaranty %</label>
          <div class="input-wrap"><input id="bizGuarantyPct" type="number" value="${state.bizGuarantyPct}" min="0" max="90" step="1"><span>%</span></div>
        </div>
        <div class="field">
          <label for="bizBalloonYears">Balloon Due (0 = none)</label>
          <div class="input-wrap"><input id="bizBalloonYears" type="number" value="${state.bizBalloonYears}" min="0" max="${state.bizAmortYears}" step="1"><span>yrs</span></div>
        </div>
        <div class="field full">
          <label for="bizNOI">Annual Net Operating Income</label>
          <div class="input-wrap"><span>$</span><input id="bizNOI" type="number" value="${state.bizNOI}" step="1000"></div>
        </div>
      </div>

      <div class="headline-figure" style="border-top:1px solid var(--line); padding-top:2rem;">
        <div class="label">Estimated Rate: ${rate.toFixed(2)}% &middot; Monthly Payment</div>
        <div class="value">${fmtMoney(pi,0)}<small> / month</small></div>
      </div>

      <div class="breakdown">
        <div class="line-item"><span>Annual Debt Service</span><span class="num">${fmtMoney(annualDebtService,0)}</span></div>
        <div class="line-item"><span>Annual Net Operating Income</span><span class="num">${fmtMoney(state.bizNOI,0)}</span></div>
        <div class="line-item"><span>Debt Service Coverage Ratio (DSCR)</span><span class="num" style="color:${dscrColor};">${dscr.toFixed(2)}x</span></div>
      </div>
      <div class="afford-result" style="padding-top:0;">
        <div class="dti-bar"><div class="fill" style="width:${Math.min(dscr/2*100,100)}%; background:${dscrColor};"></div></div>
        <div class="dti-note">${dscrNote}</div>
      </div>

      ${balloonBalance !== null ? `
      <div class="savings-callout" style="margin:1.5rem 2rem;">
        <div class="label">Balloon Payment Due â€” Year ${state.bizBalloonYears}</div>
        <div class="value">${fmtMoney(balloonBalance,0)}</div>
      </div>` : ''}

      ${isSba ? `
      <div class="breakdown" style="padding-top:0;">
        <div class="line-item"><span>Guaranteed Portion (${state.bizGuarantyPct}%)</span><span class="num">${fmtMoney(guarantyInfo.guaranteedPortion,0)}</span></div>
        <div class="line-item"><span>Est. Upfront Guaranty Fee (${guarantyInfo.feePct}%)</span><span class="num">${fmtMoney(guarantyInfo.fee,0)}</span></div>
        <div class="line-item"><span>Est. Annual Service Fee (0.55%)</span><span class="num">${fmtMoney(annualServiceFee,0)}</span></div>
      </div>
      <p style="padding:0 2rem 1.5rem; font-size:0.78rem; color:var(--ink-soft); font-family:'IBM Plex Mono',monospace;">
        Guaranty fee shown is an estimate based on published FY tranche schedules for standard, non-manufacturer 7(a) loans over 12 months maturity. Manufacturers and loans under $150k may qualify for reduced or waived fees. Confirm exact figures with your SBA lender.
      </p>
      ` : ''}

      <div class="ad-slot" data-ad-format="multipurpose" data-ad-name="calc-related"></div>

      <div class="actions" style="padding-top:0;">
        <a href="#" onclick="event.preventDefault(); state.step=3; render();" style="align-self:center; font-size:0.85rem; color:var(--ink-soft); text-decoration:underline; margin-right:auto;">Looking for a home mortgage instead?</a>
        <button class="btn-primary" id="toBizAmort">View Full Amortization Ledger &rarr;</button>
      </div>
    </div>

    <div class="panel" style="margin-top:2rem;">
      <div class="article">
        <h2>SBA 7(a) vs. SBA 504 vs. Conventional Commercial Loans</h2>
        <p>The <strong>SBA 7(a) loan</strong> is the SBA's most flexible and widely used program, usable for working capital, equipment, real estate, refinancing debt, or buying a business, with loans up to $5 million and terms up to 25 years for real estate. Rates are typically variable, set as the prime rate plus a lender spread capped by SBA rules.</p>
        <p>The <strong>SBA 504 loan</strong> is structured specifically for major fixed assets â€” commercial real estate or heavy equipment â€” and splits financing between a bank (50%), a Certified Development Company backed by the SBA (up to 40%), and the borrower (as little as 10% down). 504 loans typically carry long fixed-rate terms, which can make budgeting more predictable than a variable-rate 7(a) loan.</p>
        <p>A <strong>conventional commercial loan</strong> comes directly from a bank with no SBA guaranty involved. These loans close faster and skip SBA guaranty fees entirely, but usually require stronger financials, a larger down payment, and often carry a shorter amortization with a balloon payment due mid-term â€” which is why the balloon field in this calculator matters most for conventional deals.</p>

        <h2>Why DSCR Is the Number Lenders Actually Care About</h2>
        <p>Debt Service Coverage Ratio (DSCR) measures whether a business's cash flow can cover its loan payments. It's calculated as annual net operating income divided by annual debt service (principal plus interest). A DSCR of 1.0 means the business generates exactly enough income to cover its debt payments with nothing left over â€” most SBA and commercial lenders want to see at least <strong>1.25x</strong>, meaning 25% more income than the debt requires, as a cushion against a slow month or unexpected expense.</p>

        <h2>Understanding the SBA Guaranty Fee</h2>
        <p>Unlike a conventional loan, the SBA doesn't lend money directly â€” it guarantees a portion of the loan a bank makes, which is what allows lenders to approve small businesses they might otherwise consider too risky. In exchange, borrowers pay an upfront guaranty fee calculated as a percentage of the <em>guaranteed</em> portion of the loan (not the full loan amount), on a tiered scale that increases with loan size. There's also an ongoing annual service fee paid by the lender, which is typically built into the loan's overall cost.</p>

        <h2>Frequently Asked Questions</h2>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">Can I use an SBA loan to buy commercial real estate?<span class="mark">+</span></div>
          <div class="faq-a">Yes â€” both 7(a) and 504 loans can finance owner-occupied commercial real estate, meaning the business itself must occupy at least 51% of an existing building (60% for new construction under 504). Pure investment properties generally don't qualify.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">What happens when a balloon payment comes due?<span class="mark">+</span></div>
          <div class="faq-a">The remaining loan balance becomes due in full. Most borrowers refinance into a new loan at that point rather than paying it off in cash â€” which is why it's worth reviewing your balance and market rates well before the balloon date arrives.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">Do SBA loan fees and rules change every year?<span class="mark">+</span></div>
          <div class="faq-a">Yes. The SBA publishes updated guaranty fee schedules, loan limits, and program rules annually, and mid-year policy changes do happen. The figures in this calculator reflect currently published guidance, but always confirm exact terms with your SBA lender before finalizing a deal.</div>
        </div>
      </div>
    </div>
  `;
}

// ---------- RENDER: STEP 2 (index 1) â€” COMMERCIAL AMORTIZATION LEDGER ----------
function renderStepBizAmort(){
  const rate = state.bizPrimeRate + state.bizSpread;
  const rows = buildAmortization(state.bizLoanAmount, rate, state.bizAmortYears);
  const totalInterest = rows.reduce((s,r)=>s+r.interest,0);
  const hasBalloon = state.bizBalloonYears > 0 && state.bizBalloonYears < state.bizAmortYears;
  const balloonRowIdx = hasBalloon ? state.bizBalloonYears - 1 : null;

  const yearsTotal = Math.ceil(rows.length/12);
  let yearRows = [];
  for(let y=0; y<yearsTotal; y++){
    const slice = rows.slice(y*12, y*12+12);
    if(slice.length === 0) continue;
    const yrPrincipal = slice.reduce((s,r)=>s+r.principalPaid,0);
    const yrInterest = slice.reduce((s,r)=>s+r.interest,0);
    const endBalance = slice[slice.length-1].balance;
    yearRows.push({year:y+1, yrPrincipal, yrInterest, endBalance});
  }

  const tableRows = yearRows.map((yr,idx)=>{
    const total = yr.yrPrincipal + yr.yrInterest;
    const pPct = total>0 ? (yr.yrPrincipal/total)*100 : 0;
    const isBalloonRow = idx === balloonRowIdx;
    return `
      <tr style="${isBalloonRow ? 'background:var(--gold-soft);' : ''}">
        <td>
          <span class="yr-strip"><span style="width:${pPct}%; background:var(--principal); float:left;"></span><span style="width:${100-pPct}%; background:var(--interest); float:left;"></span></span>
          Year ${yr.year}${isBalloonRow ? ' â€” Balloon Due' : ''}
        </td>
        <td>${fmtMoney(yr.yrPrincipal,0)}</td>
        <td>${fmtMoney(yr.yrInterest,0)}</td>
        <td>${fmtMoney(yr.endBalance,0)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="eyebrow">Step 02</div>
    <h1>Commercial Amortization Ledger</h1>
    <p class="sub">Full year-by-year payment schedule for your SBA or commercial loan, including where a balloon payment falls if one applies.</p>

    <div class="panel">
      <div class="breakdown" style="padding-bottom:0;">
        <div class="line-item"><span>Loan Amount</span><span class="num">${fmtMoney(state.bizLoanAmount,0)}</span></div>
        <div class="line-item"><span>Rate</span><span class="num">${rate.toFixed(2)}%</span></div>
        <div class="line-item"><span>Total Interest Over Term</span><span class="num">${fmtMoney(totalInterest,0)}</span></div>
      </div>

      <div class="ad-slot" data-ad-format="horizontal" data-ad-name="calc-banner2"></div>

      <div class="ledger-table-wrap">
        <table>
          <thead>
            <tr><th>Year</th><th>Principal Paid</th><th>Interest Paid</th><th>Remaining Balance</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <div class="actions">
        <button class="btn-ghost" id="backToBiz">&larr; Back</button>
        <button class="btn-primary" id="bizToLoc">Line of Credit Calculator &rarr;</button>
      </div>
    </div>
  `;
}

// ---------- LINE OF CREDIT SCHEDULE BUILDER ----------
function buildLocSchedule(limit, annualRate, draws, months, paymentType, minPercent){
  const r = annualRate/100/12;
  let balance = 0;
  const rows = [];
  let overLimitFlag = false;

  for(let m=1; m<=months; m++){
    const beginningBalance = balance;
    const drawsThisMonth = draws.filter(d => d.month === m).reduce((s,d)=>s+d.amount, 0);
    let balanceAfterDraw = beginningBalance + drawsThisMonth;
    if(balanceAfterDraw > limit){ overLimitFlag = true; }
    if(balanceAfterDraw < 0) balanceAfterDraw = 0;

    const interest = balanceAfterDraw * r;
    let payment, principalPaid;
    if(paymentType === 'percentBalance'){
      payment = Math.max(interest, balanceAfterDraw * (minPercent/100));
      principalPaid = Math.min(payment - interest, balanceAfterDraw);
    } else {
      payment = interest;
      principalPaid = 0;
    }
    const endingBalance = Math.max(0, balanceAfterDraw - principalPaid);

    rows.push({ month:m, beginningBalance, draw:drawsThisMonth, balanceAfterDraw, interest, payment, endingBalance });
    balance = endingBalance;
  }
  return { rows, overLimitFlag };
}

// ---------- RENDER: STEP 3 (index 2) â€” LINE OF CREDIT ----------
function renderStepLOC(){
  const rate = state.locPrimeRate + state.locSpread;
  const { rows, overLimitFlag } = buildLocSchedule(
    state.locLimit, rate, state.locDraws, state.locMonths, state.locPaymentType, state.locMinPercent
  );
  const totalInterest = rows.reduce((s,r)=>s+r.interest,0);
  const totalDraws = rows.reduce((s,r)=>s+Math.max(0,r.draw),0);
  const currentBalance = rows.length ? rows[rows.length-1].endingBalance : 0;
  const availableCredit = Math.max(0, state.locLimit - currentBalance);

  const drawRowsHtml = state.locDraws.map(d => `
    <div class="draw-row" data-draw-id="${d.id}">
      <div class="input-wrap"><input type="number" class="loc-draw-month" data-id="${d.id}" value="${d.month}" min="1" max="${state.locMonths}" step="1"><span style="border-right:none; border-left:1px solid var(--line); padding:0.7rem 0.5rem;">mo</span></div>
      <div class="input-wrap"><span>$</span><input type="number" class="loc-draw-amount" data-id="${d.id}" value="${d.amount}" step="500"></div>
      <button class="btn-remove" data-remove-id="${d.id}" title="Remove">&times;</button>
    </div>
  `).join('');

  const tableRows = rows.map(r => `
    <tr>
      <td>Month ${r.month}</td>
      <td>${fmtMoney(r.beginningBalance,0)}</td>
      <td style="${r.draw > 0 ? 'color:var(--principal);' : r.draw < 0 ? 'color:var(--interest);' : ''}">${r.draw !== 0 ? (r.draw>0?'+':'') + fmtMoney(r.draw,0) : 'â€”'}</td>
      <td>${fmtMoney(r.interest,2)}</td>
      <td>${fmtMoney(r.payment,2)}</td>
      <td>${fmtMoney(r.endingBalance,0)}</td>
    </tr>
  `).join('');

  return `
    <div class="eyebrow">Step 03</div>
    <h1>Line of Credit Calculator</h1>
    <p class="sub">Enter draws as you receive them (and repayments as negative amounts) to see interest accrue and your required payment recalculate month by month.</p>

    <div class="panel">
      <div class="field-grid" style="padding-bottom:0.5rem;">
        <div class="field">
          <label for="locLimit">Credit Limit</label>
          <div class="input-wrap"><span>$</span><input id="locLimit" type="number" value="${state.locLimit}" step="5000"></div>
        </div>
        <div class="field">
          <label for="locMonths">Projection Length</label>
          <div class="input-wrap"><input id="locMonths" type="number" value="${state.locMonths}" min="1" max="60" step="1"><span>months</span></div>
        </div>
        <div class="field">
          <label for="locPrimeRate">Prime Rate</label>
          <div class="input-wrap"><input id="locPrimeRate" type="number" value="${state.locPrimeRate}" step="0.01"><span>%</span></div>
        </div>
        <div class="field">
          <label for="locSpread">Lender Spread</label>
          <div class="input-wrap"><input id="locSpread" type="number" value="${state.locSpread}" step="0.05"><span>%</span></div>
        </div>
        <div class="field">
          <label for="locPaymentType">Payment Type</label>
          <select id="locPaymentType">
            <option value="interestOnly" ${state.locPaymentType==='interestOnly'?'selected':''}>Interest-Only</option>
            <option value="percentBalance" ${state.locPaymentType==='percentBalance'?'selected':''}>Minimum % of Balance</option>
          </select>
        </div>
        ${state.locPaymentType==='percentBalance' ? `
        <div class="field">
          <label for="locMinPercent">Minimum Payment</label>
          <div class="input-wrap"><input id="locMinPercent" type="number" value="${state.locMinPercent}" step="0.5"><span>% of balance</span></div>
        </div>` : `<div class="field"></div>`}
      </div>

      <div class="draws-panel">
        <label style="display:block; margin-bottom:0.5rem;">Draws &amp; Repayments</label>
        <div class="draw-hint">Positive amount = draw received &middot; negative amount = repayment applied</div>
        <div id="drawRowsContainer">${drawRowsHtml}</div>
        <button class="btn-add-row" id="addDrawRow">+ Add Draw or Repayment</button>
      </div>

      <div class="headline-figure" style="border-top:1px solid var(--line); padding-top:2rem;">
        <div class="label">Current Balance (Month ${state.locMonths})</div>
        <div class="value">${fmtMoney(currentBalance,0)}<small> of ${fmtMoney(state.locLimit,0)} limit</small></div>
      </div>

      ${overLimitFlag ? `<p class="over-limit-flag" style="padding:0 2rem;">One or more months exceeds your credit limit â€” increase the limit or reduce draws.</p>` : ''}

      <div class="breakdown" style="padding-top:1rem;">
        <div class="line-item"><span>Total Drawn</span><span class="num">${fmtMoney(totalDraws,0)}</span></div>
        <div class="line-item"><span>Total Interest Paid Over Period</span><span class="num">${fmtMoney(totalInterest,0)}</span></div>
        <div class="line-item"><span>Available Credit Remaining</span><span class="num">${fmtMoney(availableCredit,0)}</span></div>
      </div>

      <div class="ad-slot" data-ad-format="rectangle" data-ad-name="calc-box"></div>

      <div class="ledger-table-wrap">
        <table>
          <thead>
            <tr><th>Month</th><th>Beginning Balance</th><th>Draw / Repay</th><th>Interest</th><th>Payment</th><th>Ending Balance</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>

      <div class="actions">
        <button class="btn-ghost" id="backToBizAmort">&larr; Back</button>
        <button class="btn-primary" id="locToNews">View Market News &rarr;</button>
      </div>
    </div>

    <div class="panel" style="margin-top:2rem;">
      <div class="article">
        <h2>How a Business Line of Credit Works</h2>
        <p>Unlike a term loan, a <strong>line of credit</strong> gives a business access to a revolving pool of funds up to an approved limit. You only pay interest on the portion you've actually drawn â€” not the full limit â€” and as you repay, that capacity becomes available to draw again, which is why it's commonly used for working capital, seasonal inventory swings, or covering gaps between receivables.</p>

        <h2>Interest-Only vs. Percent-of-Balance Payments</h2>
        <p>Many revolving lines only require an <strong>interest-only payment</strong> each period, meaning the principal balance doesn't shrink unless you choose to pay it down. Others require a <strong>minimum payment based on a percentage of the outstanding balance</strong> â€” commonly 1â€“3% â€” which gradually reduces principal even if you don't pay extra. This calculator lets you model either structure.</p>

        <h2>Frequently Asked Questions</h2>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">Is a line of credit's interest rate usually fixed or variable?<span class="mark">+</span></div>
          <div class="faq-a">Most business lines of credit carry a variable rate tied to prime, similar to an SBA 7(a) loan â€” which is why this calculator uses the same prime-plus-spread structure.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">What happens if I go over my credit limit?<span class="mark">+</span></div>
          <div class="faq-a">Most lenders simply won't authorize a draw that exceeds your available limit. Some may allow a temporary over-limit with an additional fee, but this varies by lender and shouldn't be assumed.</div>
        </div>
      </div>
    </div>
  `;
}

// ---------- RENDER: STEP 6 â€” MARKET NEWS & RATES ----------
function renderStep6(){
  return `
    <div class="eyebrow">Step 09 &middot; Updated July 29, 2026</div>
    <h1>Market News &amp; Rates</h1>
    <p class="sub">A snapshot of today's average rates and the latest developments in home lending and small business financing.</p>

    <div class="panel">
      <div class="rate-strip">
        <div class="rate-cell"><div class="label">30-Yr Fixed</div><div class="value">6.75%</div></div>
        <div class="rate-cell"><div class="label">15-Yr Fixed</div><div class="value">5.95%</div></div>
        <div class="rate-cell"><div class="label">30-Yr Refinance</div><div class="value">6.80%</div></div>
        <div class="rate-cell"><div class="label">5/1 ARM</div><div class="value">6.46%</div></div>
      </div>
      <p style="padding:1rem 2rem 0; font-size:0.75rem; color:var(--ink-soft); font-family:'IBM Plex Mono',monospace;">
        National averages, compiled from lender-reported data. Individual rates vary by credit profile, down payment, and lender. Not a rate quote.
      </p>

      <div class="ad-slot" data-ad-format="auto" data-ad-name="calc-flex"></div>

      <div>
        <div class="news-card">
          <div class="news-meta">Rates &middot; U.S. News &amp; World Report</div>
          <h3>Mortgage Rates Ease Slightly Ahead of the Fed's July Meeting</h3>
          <p>The average 30-year fixed purchase rate slipped to roughly 6.83% heading into this week's Federal Reserve meeting, after climbing for much of the summer on inflation concerns tied to elevated oil prices.</p>
          <a href="https://money.usnews.com/loans/mortgages/articles/mortgage-rates-today-july-29-2026" target="_blank" rel="noopener">Read the full report &rarr;</a>
        </div>

        <div class="news-card">
          <div class="news-meta">Forecast &middot; Forbes Advisor</div>
          <h3>Fed Holds Steady as Forecasters Debate Where Rates Head Next</h3>
          <p>With the federal funds rate unchanged since the last several meetings, analysts remain split â€” some expect modest relief for borrowers later this year, while others point to persistent inflation keeping rates elevated into 2027.</p>
          <a href="https://www.forbes.com/advisor/mortgages/mortgage-rates-07-29-26/" target="_blank" rel="noopener">Read the full report &rarr;</a>
        </div>

        <div class="news-card">
          <div class="news-meta">Housing Market &middot; Bankrate</div>
          <h3>Home Prices Hit a Record High Even as Wage Growth Outpaces Inflation</h3>
          <p>The median price of an existing home reached an all-time high in June, even as second-quarter wage growth ran ahead of inflation â€” a combination that continues to squeeze affordability for buyers despite modestly easing rates.</p>
          <a href="https://www.bankrate.com/mortgages/mortgage-rates/" target="_blank" rel="noopener">Read the full report &rarr;</a>
        </div>

        <div class="news-card">
          <div class="news-meta">SBA Policy &middot; U.S. Small Business Administration</div>
          <h3>SBA Doubles Combined 7(a) and 504 Loan Limit to $10 Million</h3>
          <p>Effective July 4, 2026, small businesses can now combine SBA 7(a) and 504 financing for up to $10 million total â€” double the previous cap â€” giving capital-intensive businesses like manufacturers and construction firms significantly more room to pair long-term real estate financing with working capital.</p>
          <a href="https://www.sba.gov/article/2026/07/07/small-businesses-now-eligible-10-million-sba-financing" target="_blank" rel="noopener">Read the full report &rarr;</a>
        </div>

        <div class="news-card">
          <div class="news-meta">SBA Policy &middot; NerdWallet</div>
          <h3>SBA Waives Guaranty Fees for Small Manufacturers Through FY2026</h3>
          <p>Manufacturers borrowing under $950,000 through a 7(a) loan â€” or any amount through a 504 loan â€” currently pay zero upfront guaranty fee under a fiscal-year 2026 waiver aimed at supporting domestic production, though standard fees still apply to most other borrowers.</p>
          <a href="https://www.nerdwallet.com/business/loans/learn/sba-loan-rates" target="_blank" rel="noopener">Read the full report &rarr;</a>
        </div>
      </div>

      <div class="ad-slot" data-ad-format="fluid" data-ad-name="calc-feed"></div>
    </div>
  `;
}

function renderFooter(){
  return `
    <div class="site-footer">
      <div class="footer-cols">
        <div class="footer-col">
          <h4>LoansFlow</h4>
          <p>A free set of calculators for home and small business financing â€” built to help you understand your numbers before you talk to a lender. Estimates only; not a loan offer or financial advice.</p>
        </div>
        <div class="footer-col">
          <h4>Tools</h4>
          <a onclick="state.step=0; render();">SBA &amp; Commercial</a>
          <a onclick="state.step=1; render();">Commercial Amortization</a>
          <a onclick="state.step=2; render();">Line of Credit</a>
          <a onclick="state.step=3; render();">Mortgage Loan Details</a>
          <a onclick="state.step=5; render();">Mortgage Amortization</a>
          <a onclick="state.step=8; render();">Market News</a>
        </div>
        <div class="footer-col">
          <h4>Site</h4>
          <a onclick="openLegal('about')">About</a>
          <a onclick="openLegal('contact')">Contact</a>
        </div>
        <div class="footer-col">
          <h4>Legal</h4>
          <a onclick="openLegal('privacy')">Privacy Policy</a>
          <a onclick="openLegal('disclaimer')">Disclaimer</a>
        </div>
      </div>
      <div class="footer-legal">
        &copy; 2026 LoansFlow. All figures are estimates for informational and educational purposes only and do not constitute financial, tax, or legal advice, nor a commitment to lend. Consult a licensed mortgage professional, SBA lender, or financial advisor before making borrowing decisions.
      </div>
    </div>

    <div class="legal-modal" id="legalModal">
      <div class="legal-modal-inner" id="legalModalInner"></div>
    </div>
  `;
}

const legalContent = {
  about: {
    title: "About LoansFlow",
    body: `<p>LoansFlow is a free calculator suite built primarily for small business owners navigating SBA and commercial financing â€” a niche most consumer finance sites underserve. Our core tools cover SBA 7(a), SBA 504, and conventional commercial loans, including debt service coverage ratio (DSCR) estimates, SBA guaranty fee calculations, balloon payment scenarios, and a full year-by-year amortization ledger.</p>
           <p>Alongside that, we offer a complete set of residential mortgage tools â€” payment breakdowns, amortization schedules with extra and balloon payments, refinance comparisons, and affordability estimates â€” for homebuyers and homeowners who want the same level of detail.</p>
           <p>Every calculation happens instantly in your browser. We don't collect loan applications, sell leads, or require an account to use any tool on this site.</p>`
  },
  contact: {
    title: "Contact",
    body: `<p>Questions, corrections, or feedback about a calculation? Reach out any time.</p>
           <p><strong>Email:</strong> loansflow707@gmail.com</p>`
  },
  privacy: {
    title: "Privacy Policy",
    body: `<p>This site does not require an account and does not collect the loan information you enter into any calculator â€” all calculations run locally in your browser and are never transmitted to our servers.</p>
           <p>Like most websites, we use cookies and similar technologies for basic site functionality and to serve advertising. We work with third-party advertising partners, including Google, who may use cookies to serve ads based on your prior visits to this and other websites. You can learn more about how Google uses this data and manage your ad preferences at Google's Ads Settings.</p>
           <p>We do not knowingly collect personal information from children under 13. This policy may be updated periodically; continued use of the site constitutes acceptance of the current policy.</p>`
  },
  disclaimer: {
    title: "Disclaimer",
    body: `<p>The calculators on this site provide estimates for general educational and informational purposes only. They are not a loan offer, pre-approval, or guarantee of terms, and do not constitute financial, legal, or tax advice.</p>
           <p>Actual loan terms â€” including interest rate, fees, insurance, taxes, and eligibility â€” are determined by individual lenders based on your full financial profile and are subject to change. SBA program rules, fees, and loan limits are set by the U.S. Small Business Administration and may change without notice; always confirm current figures directly with an SBA-approved lender.</p>
           <p>We are not a lender, mortgage broker, or SBA-approved lender, and using these calculators does not constitute an application for credit.</p>`
  }
};

function openLegal(key){
  const content = legalContent[key];
  document.getElementById('legalModalInner').innerHTML = `
    <h2>${content.title}</h2>
    ${content.body}
    <button class="legal-modal-close" onclick="document.getElementById('legalModal').classList.remove('open')">Close</button>
  `;
  document.getElementById('legalModal').classList.add('open');
}

function render(){
  renderNav();
  const main = document.getElementById('mainContent');
  const renderers = [renderStep5, renderStepBizAmort, renderStepLOC, renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep6];
  main.innerHTML = renderers[state.step]() + renderFooter();
  attachHandlers();
  main.scrollTop = 0;
  window.scrollTo(0,0);
}

function readInputs(ids){
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    const val = parseFloat(el.value);
    if(!isNaN(val)) state[id] = val;
  });
}

function attachHandlers(){
  const b0 = document.getElementById('toResults');
  if(b0) b0.addEventListener('click', ()=>{
    readInputs(['homePrice','downPayment','rate','taxRate','insurance']);
    const termEl = document.getElementById('term');
    if(termEl) state.term = parseInt(termEl.value);
    state.step = 4; render();
  });

  const back0 = document.getElementById('backTo0');
  if(back0) back0.addEventListener('click', ()=>{ state.step = 3; render(); });

  const toAmort = document.getElementById('toAmort');
  if(toAmort) toAmort.addEventListener('click', ()=>{ state.step = 5; render(); });

  const back1 = document.getElementById('backTo1');
  if(back1) back1.addEventListener('click', ()=>{ state.step = 4; render(); });

  const toRefi = document.getElementById('toRefi');
  if(toRefi) toRefi.addEventListener('click', ()=>{ state.step = 6; render(); });

  const back2 = document.getElementById('backTo2');
  if(back2) back2.addEventListener('click', ()=>{ state.step = 5; render(); });

  const toAfford = document.getElementById('toAfford');
  if(toAfford) toAfford.addEventListener('click', ()=>{
    readInputs(['newRate']);
    const newTermEl = document.getElementById('newTerm');
    if(newTermEl) state.newTerm = parseInt(newTermEl.value);
    state.step = 7; render();
  });

  const back3 = document.getElementById('backTo3');
  if(back3) back3.addEventListener('click', ()=>{ state.step = 6; render(); });

  const toStart = document.getElementById('toStart');
  if(toStart) toStart.addEventListener('click', ()=>{ state.step = 3; render(); });

  const toBizAmort = document.getElementById('toBizAmort');
  if(toBizAmort) toBizAmort.addEventListener('click', ()=>{ state.step = 1; render(); });

  const backToBiz = document.getElementById('backToBiz');
  if(backToBiz) backToBiz.addEventListener('click', ()=>{ state.step = 0; render(); });

  const bizToLoc = document.getElementById('bizToLoc');
  if(bizToLoc) bizToLoc.addEventListener('click', ()=>{ state.step = 2; render(); });

  const backToBizAmort = document.getElementById('backToBizAmort');
  if(backToBizAmort) backToBizAmort.addEventListener('click', ()=>{ state.step = 1; render(); });

  const locToNews = document.getElementById('locToNews');
  if(locToNews) locToNews.addEventListener('click', ()=>{ state.step = 8; render(); });

  // line of credit â€” field changes
  ['locLimit','locMonths','locPrimeRate','locSpread','locPaymentType','locMinPercent'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', ()=>{
      readInputs(['locLimit','locMonths','locPrimeRate','locSpread','locMinPercent']);
      const typeEl = document.getElementById('locPaymentType');
      if(typeEl) state.locPaymentType = typeEl.value;
      render();
    });
  });

  // line of credit â€” draw row month/amount changes
  document.querySelectorAll('.loc-draw-month, .loc-draw-amount').forEach(el=>{
    el.addEventListener('change', ()=>{
      const id = parseInt(el.dataset.id);
      const draw = state.locDraws.find(d=>d.id===id);
      if(!draw) return;
      const val = parseFloat(el.value);
      if(isNaN(val)) return;
      if(el.classList.contains('loc-draw-month')) draw.month = val;
      else draw.amount = val;
      render();
    });
  });

  // line of credit â€” remove a draw row
  document.querySelectorAll('.btn-remove').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = parseInt(el.dataset.removeId);
      state.locDraws = state.locDraws.filter(d=>d.id!==id);
      render();
    });
  });

  // line of credit â€” add a draw row
  const addDrawRow = document.getElementById('addDrawRow');
  if(addDrawRow) addDrawRow.addEventListener('click', ()=>{
    state.locDraws.push({ id: state.locNextDrawId++, month: 1, amount: 10000 });
    render();
  });

  // live-recalc on SBA / commercial loan fields
  ['bizLoanType','bizLoanAmount','bizPrimeRate','bizSpread','bizGuarantyPct','bizAmortYears','bizBalloonYears','bizNOI'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', ()=>{
      readInputs(['bizLoanAmount','bizPrimeRate','bizSpread','bizGuarantyPct','bizAmortYears','bizBalloonYears','bizNOI']);
      const typeEl = document.getElementById('bizLoanType');
      if(typeEl) state.bizLoanType = typeEl.value;
      render();
    });
  });

  // live-recalc on amortization extra/balloon payment fields
  ['extraMonthly','balloonAmount','balloonMonth'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', ()=>{
      readInputs(['extraMonthly','balloonAmount','balloonMonth']);
      render();
    });
  });

  // live-recalc on refi/afford field changes
  ['newRate','newTerm'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', ()=>{
      readInputs(['newRate']);
      const t = document.getElementById('newTerm');
      if(t) state.newTerm = parseInt(t.value);
      render();
    });
  });
  ['income','monthlyDebts','affordDownPayment','affordRate'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', ()=>{
      readInputs(['income','monthlyDebts','affordDownPayment','affordRate']);
      render();
    });
  });
}

if (typeof window.__LF_INITIAL_STEP === 'number' && window.__LF_INITIAL_STEP >= 0 && window.__LF_INITIAL_STEP <= 8) {
  state.step = window.__LF_INITIAL_STEP;
}
render();




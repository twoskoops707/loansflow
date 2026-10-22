
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
  refiYearsPaid: 2,     // years of payments already made on the current loan
  refiClosingCosts: 5000,
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
  locNextDrawId: 4,
  amortChartMode: 'balance',

  // has the visitor answered (or skipped) the "what are you financing" intake?
  introDone: false
};

// Transient intake-wizard UI state — not part of shareable/pinned scenarios.
let introStage = 'start';   // 'start' | 'business' | 'mortgage' | 'details'
let introPick = null;       // { step, bizType, audience } chosen before the details screen

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

const STATE_ENUMS = {
  bizLoanType: ['sba7a', 'sba504', 'conventional'],
  locPaymentType: ['interestOnly', 'percentBalance'],
  amortChartMode: ['balance', 'interest', 'principal']
};

// ---------- PINNED SCENARIOS (compare) ----------
const PIN_STORAGE_KEY = 'lf-pinned-scenarios';
let pinnedScenarios = loadPinnedScenarios();
let pinSeq = 0;

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

// ---------- CSV EXPORT ----------
function toCsv(headers, rows){
  const escapeCell = cell => {
    const str = String(cell ?? '');
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  };
  return '\uFEFF' + [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
}
function downloadCsv(filename, csv){
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function exportBizAmortCsv(){
  const rate = state.bizPrimeRate + state.bizSpread;
  const yearRows = amortizationYearRows(buildAmortization(state.bizLoanAmount, rate, state.bizAmortYears));
  const csv = toCsv(['Year','Principal Paid','Interest Paid','Remaining Balance'],
    yearRows.map(yr => [yr.year, yr.yrPrincipal.toFixed(2), yr.yrInterest.toFixed(2), yr.endBalance.toFixed(2)]));
  downloadCsv('loansflow-business-amortization.csv', csv);
}
function exportMortgageAmortCsv(){
  const principal = Math.max(0, state.homePrice - state.downPayment);
  const yearRows = amortizationYearRows(buildAmortization(principal, state.rate, state.term, state.extraMonthly, state.balloonAmount, state.balloonMonth));
  const csv = toCsv(['Year','Principal Paid','Interest Paid','Remaining Balance'],
    yearRows.map(yr => [yr.year, yr.yrPrincipal.toFixed(2), yr.yrInterest.toFixed(2), yr.endBalance.toFixed(2)]));
  downloadCsv('loansflow-mortgage-amortization.csv', csv);
}
function exportLocCsv(){
  const rate = state.locPrimeRate + state.locSpread;
  const { rows } = buildLocSchedule(state.locLimit, rate, state.locDraws, state.locMonths, state.locPaymentType, state.locMinPercent);
  const csv = toCsv(['Month','Beginning Balance','Draw / Repayment','Interest','Payment','Ending Balance'],
    rows.map(r => [r.month, r.beginningBalance.toFixed(2), r.draw.toFixed(2), r.interest.toFixed(2), r.payment.toFixed(2), r.endingBalance.toFixed(2)]));
  downloadCsv('loansflow-line-of-credit.csv', csv);
}

// ---------- WORKFLOW: SNAPSHOT, SHARING & PRINT ----------
function mortgageMetrics(s){
  s = s || state;
  const principal = Math.max(0, s.homePrice - s.downPayment);
  const pi = monthlyPI(principal, s.rate, s.term);
  const tax = (s.homePrice * s.taxRate / 100) / 12;
  const insurance = s.insurance / 12;
  return { principal, pi, tax, insurance, total: pi + tax + insurance, interest: pi * s.term * 12 - principal };
}

// Affordability: the 28% front-end limit covers the WHOLE housing payment (principal, interest, taxes, insurance),
// and the 36% back-end limit covers housing plus other debts. Taxes and insurance reduce what is left for principal and interest.
function affordMetrics(s){
  s = s || state;
  const monthlyIncome = s.income/12;
  const maxHousingPayment = monthlyIncome * 0.28;
  const backEndRoom = monthlyIncome * 0.36 - s.monthlyDebts;
  const budgetPITI = Math.max(0, Math.min(maxHousingPayment, backEndRoom));
  const f = monthlyPI(1, s.affordRate, 30);          // monthly P&I per $1 borrowed (30-year)
  const t = (s.taxRate/100)/12;                      // monthly tax per $1 of price
  const ins = s.insurance/12;
  const room = budgetPITI - ins;
  let maxHomePrice = 0;
  if(room > 0){
    maxHomePrice = Math.max(0, (room + s.affordDownPayment*f) / (f + t));
  }
  const maxPrincipal = Math.max(0, maxHomePrice - s.affordDownPayment);
  const pi = maxPrincipal * f;
  const tax = maxHomePrice * t;
  const backEndDti = ((s.monthlyDebts + budgetPITI) / monthlyIncome) * 100;
  return { monthlyIncome, maxHousingPayment, budgetPITI, maxPrincipal, maxHomePrice, pi, tax, ins, backEndDti };
}

// Refinance: the current loan is partly paid down, so compare what is left of it against a new loan on that balance.
function refiMetrics(s){
  s = s || state;
  const principal = Math.max(0, s.homePrice - s.downPayment);
  const n = s.term*12;
  const paid = Math.min(Math.max(0, Math.round(s.refiYearsPaid*12)), n - 1);
  const r = (s.rate/100)/12;
  const currentPI = monthlyPI(principal, s.rate, s.term);
  const balance = r === 0 ? principal*(1 - paid/n) : principal * (Math.pow(1+r,n) - Math.pow(1+r,paid)) / (Math.pow(1+r,n) - 1);
  const remainingMonths = n - paid;
  const newPI = monthlyPI(balance, s.newRate, s.newTerm);
  const remainingInterestCurrent = currentPI*remainingMonths - balance;
  const newInterest = newPI*s.newTerm*12 - balance;
  const monthlySavings = currentPI - newPI;
  const interestChange = remainingInterestCurrent - newInterest;      // positive = interest saved
  const totalCostChange = interestChange - s.refiClosingCosts;        // after closing costs
  const breakEvenMonths = monthlySavings > 0 ? s.refiClosingCosts / monthlySavings : null;
  return { principal, paid, balance, remainingMonths, currentPI, newPI, monthlySavings, remainingInterestCurrent, newInterest, interestChange, totalCostChange, breakEvenMonths };
}

function businessMetrics(s){
  s = s || state;
  const rate = s.bizPrimeRate + s.bizSpread;
  const payment = monthlyPI(s.bizLoanAmount, rate, s.bizAmortYears);
  return { rate, payment, annualDebtService: payment * 12, dscr: s.bizNOI / (payment * 12) };
}

function locMetrics(s){
  s = s || state;
  const rate = s.locPrimeRate + s.locSpread;
  const schedule = buildLocSchedule(s.locLimit, rate, s.locDraws, s.locMonths, s.locPaymentType, s.locMinPercent);
  const last = schedule.rows[schedule.rows.length - 1];
  return {
    rate,
    balance: last ? last.endingBalance : 0,
    interest: schedule.rows.reduce((sum, row) => sum + row.interest, 0),
    available: Math.max(0, s.locLimit - (last ? last.endingBalance : 0))
  };
}

function snapshotStats(){
  if (state.step === 2) {
    const metrics = locMetrics();
    return [
      { label: 'Projected balance', value: fmtMoney(metrics.balance, 0) },
      { label: 'Interest / period', value: fmtMoney(metrics.interest, 0) },
      { label: 'Available credit', value: fmtMoney(metrics.available, 0) }
    ];
  }
  if (state.step === 0 || state.step === 1) {
    const metrics = businessMetrics();
    return [
      { label: 'Monthly payment', value: fmtMoney(metrics.payment, 0) },
      { label: 'Total rate', value: metrics.rate.toFixed(2) + '%' },
      { label: 'DSCR', value: metrics.dscr.toFixed(2) + 'x' }
    ];
  }
  const metrics = mortgageMetrics();
  return [
    { label: 'Loan amount', value: fmtMoney(metrics.principal, 0) },
    { label: 'Monthly PITI', value: fmtMoney(metrics.total, 0) },
    { label: 'Lifetime interest', value: fmtMoney(metrics.interest, 0) }
  ];
}

function renderWorkflowBar(){
  const stats = snapshotStats();
  const pins = pinnedScenarios.length;
  return `
    <section class="workflow-bar" aria-label="Scenario tools">
      <div class="workflow-top">
        <div class="workflow-heading">
          <span class="workflow-dot" aria-hidden="true"></span>
          <div>
            <div class="workflow-kicker">Working scenario</div>
            <strong>${steps[state.step]}</strong>
          </div>
        </div>
        <div class="snapshot-stats">
          ${stats.map(stat => `<div class="snapshot-stat"><span>${stat.label}</span><strong>${stat.value}</strong></div>`).join('')}
        </div>
      </div>
      <div class="workflow-actions">
        <button class="btn-utility" id="pinScenario" type="button" title="Save these numbers so you can compare them against other versions">+ Pin this scenario</button>
        <button class="btn-utility" id="compareScenarios" type="button" title="See your pinned scenarios side by side">Compare pinned${pins ? ' (' + pins + ')' : ''}</button>
        <button class="btn-utility" id="shareScenario" type="button" title="Copy a link that reopens this exact scenario">Copy share link</button>
        <span class="workflow-status" id="workflowStatus" role="status" aria-live="polite"></span>
      </div>
    </section>
    <div class="report-bar">
      <p><strong>Need a copy?</strong> Download a clean PDF report of this calculator for your lender or your records.</p>
      <button class="btn-utility btn-utility--accent" id="printReport" type="button" title="Opens your print dialog — choose Save as PDF">Download PDF report</button>
    </div>
  `;
}

function renderPaymentMixChart(pi, tax, insurance, total){
  const values = [pi, tax, insurance];
  const totalSafe = total || 1;
  const labels = ['Principal & interest', 'Property tax', 'Home insurance'];
  const colors = ['#34d59a', '#ffb020', '#7d7d86'];
  const circumference = 439.82;
  let offset = 0;
  const segments = values.map((value, index) => {
    const percent = total ? value / total : 0;
    const dash = percent * circumference;
    const html = `<circle class="chart-segment" data-chart-label="${labels[index]}" data-chart-value="${fmtMoney(value, 2)}" cx="110" cy="110" r="70" fill="none" stroke="${colors[index]}" stroke-width="24" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)"></circle>`;
    offset += dash;
    return html;
  }).join('');
  return `
    <div class="chart-card">
      <div class="chart-card-head"><div><div class="chart-kicker">Interactive view</div><h2>Where the payment goes</h2></div><span class="chart-hint">Hover a segment</span></div>
      <div class="donut-chart-wrap">
        <svg class="donut-chart" viewBox="0 0 220 220" role="img" aria-label="Monthly payment composition">${segments}<circle cx="110" cy="110" r="57" fill="var(--surface)"></circle><text x="110" y="105" text-anchor="middle" class="donut-total">${fmtMoney(total, 0)}</text><text x="110" y="124" text-anchor="middle" class="donut-caption">per month</text></svg>
        <div class="chart-legend">${values.map((value, index) => `<button class="chart-legend-item" type="button" data-chart-target="${labels[index]}"><span class="chart-color" style="background:${colors[index]}"></span><span>${labels[index]}</span><strong>${Math.round((value / totalSafe) * 100)}%</strong></button>`).join('')}</div>
      </div>
      <div class="chart-tooltip" id="chartTooltip" role="status"></div>
    </div>
  `;
}

function renderBalanceChart(rows, mode){
  if (!rows.length) {
    return `<div class="chart-card chart-card--wide"><div class="chart-card-head"><div><div class="chart-kicker">Interactive view</div><h2>Loan trajectory</h2></div></div><p class="chart-empty">Add a loan amount to see the payoff trajectory.</p></div>`;
  }
  const points = [];
  const width = 620;
  const height = 240;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 34;
  const values = rows.map(row => mode === 'balance' ? row.endBalance : mode === 'interest' ? row.yrInterest : row.yrPrincipal);
  const max = Math.max(...values, 1);
  const principal = rows[0] ? rows[0].endBalance + rows[0].yrPrincipal : 1;
  const chartMax = mode === 'balance' ? principal : max;
  rows.forEach((row, index) => {
    const x = padLeft + (rows.length === 1 ? 0 : index / (rows.length - 1)) * (width - padLeft - padRight);
    const y = padTop + (1 - values[index] / chartMax) * (height - padTop - padBottom);
    points.push({ x, y, value: values[index], label: `Year ${row.year}` });
  });
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const label = mode === 'balance' ? 'Remaining balance' : mode === 'interest' ? 'Annual interest' : 'Annual principal';
  return `
    <div class="chart-card chart-card--wide">
      <div class="chart-card-head"><div><div class="chart-kicker">Interactive view</div><h2>Loan trajectory</h2></div><div class="chart-tabs"><button type="button" class="chart-tab ${mode === 'balance' ? 'active' : ''}" data-chart-mode="balance">Balance</button><button type="button" class="chart-tab ${mode === 'interest' ? 'active' : ''}" data-chart-mode="interest">Interest</button><button type="button" class="chart-tab ${mode === 'principal' ? 'active' : ''}" data-chart-mode="principal">Principal</button></div></div>
      <div class="line-chart-wrap"><svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label} by year"><line class="chart-axis" x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${height - padBottom}"></line><line class="chart-axis" x1="${padLeft}" y1="${height - padBottom}" x2="${width - padRight}" y2="${height - padBottom}"></line><path class="chart-area" d="${path} L ${points[points.length - 1].x.toFixed(1)} ${height - padBottom} L ${points[0].x.toFixed(1)} ${height - padBottom} Z"></path><path class="chart-line" d="${path}"></path>${points.map(point => `<circle class="chart-point" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" data-chart-label="${point.label}" data-chart-value="${fmtMoney(point.value, 0)}"></circle>`).join('')}<text class="chart-axis-label" x="${padLeft}" y="${height - 10}">Year 1</text><text class="chart-axis-label" text-anchor="end" x="${width - padRight}" y="${height - 10}">Year ${rows[rows.length - 1].year}</text></svg></div>
      <div class="chart-caption"><span>${label}</span><span>Hover a point for the annual figure</span></div><div class="chart-tooltip" id="chartTooltip" role="status"></div>
    </div>
  `;
}

// ---------- PRINT: STEP-AWARE REPORT ----------
function printRow(label, value){
  return `<div><span>${label}</span><strong>${value}</strong></div>`;
}
function printTable(headers, rows){
  return `
    <table class="print-report-schedule">
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}
function printSectionTitle(title){
  return `<h2 class="print-report-section">${title}</h2>`;
}
function printReportShell(inner){
  return `
    <section class="print-report ${reportOpts.color ? 'print-report--color' : ''}" aria-label="Printable LoansFlow report">
      <div class="print-report-header">
        <div>
          <div class="workflow-kicker">LoansFlow planning brief</div>
          <h1>${steps[state.step]}</h1>
          <p>Prepared ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at loansflow.loan</p>
        </div>
        <div class="print-report-mark">LOANS<br><span>FLOW</span></div>
      </div>
      ${inner}
      <p class="print-report-foot">LoansFlow is a planning calculator, not a lender, financial adviser, or loan offer. Figures are estimates generated from the inputs shown and may not reflect actual underwriting terms. Confirm rates, fees, taxes, insurance, and lender requirements before making a decision.</p>
    </section>
  `;
}
function amortizationYearRows(rows){
  const yearsTotal = Math.ceil(rows.length/12);
  const yearRows = [];
  for(let y=0; y<yearsTotal; y++){
    const slice = rows.slice(y*12, y*12+12);
    if(slice.length === 0) continue;
    const yrPrincipal = slice.reduce((s,r)=>s+r.principalPaid,0);
    const yrInterest = slice.reduce((s,r)=>s+r.interest,0);
    const endBalance = slice[slice.length-1].balance;
    yearRows.push({year:y+1, yrPrincipal, yrInterest, endBalance});
  }
  return yearRows;
}

// Report options picked in the "Download PDF report" dialog (not part of shareable state).
const reportOpts = { schedule: 'annual', daily: false, color: true };
const SCHEDULE_STEPS = [0, 1, 3, 4, 5];  // steps whose report can include an amortization schedule

function groupSchedule(rows, size){
  const out = [];
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    out.push({
      from: slice[0].month, to: slice[slice.length - 1].month,
      payment: slice.reduce((t, r) => t + r.pmt, 0),
      principal: slice.reduce((t, r) => t + r.principalPaid, 0),
      interest: slice.reduce((t, r) => t + r.interest, 0),
      balance: slice[slice.length - 1].balance
    });
  }
  return out;
}
const SCHEDULE_TITLES = { annual: 'Annual summary', quarterly: 'Quarterly schedule', monthly: 'Every payment', daily: 'Daily interest (30 days)' };
function scheduleTableHtml(rows, mode){
  if (!rows.length) return '';
  if (mode === 'monthly') {
    return printTable(['Payment #', 'Payment', 'Principal', 'Interest', 'Balance'],
      rows.map(r => [r.month, fmtMoney(r.pmt, 2), fmtMoney(r.principalPaid, 2), fmtMoney(r.interest, 2), fmtMoney(r.balance, 2)]));
  }
  const quarterly = mode === 'quarterly';
  return printTable([quarterly ? 'Quarter' : 'Year', 'Payments', 'Total paid', 'Principal', 'Interest', 'Balance'],
    groupSchedule(rows, quarterly ? 3 : 12).map((g, i) => [
      quarterly ? 'Q' + (i % 4 + 1) + ', year ' + (Math.floor(i / 4) + 1) : i + 1,
      g.from + '–' + g.to, fmtMoney(g.payment, 0), fmtMoney(g.principal, 0), fmtMoney(g.interest, 0), fmtMoney(g.balance, 0)
    ]));
}
// 30 days of per-diem interest on the opening balance, starting today.
// dayBasis: 365 for mortgages, 360 for commercial/SBA (common lender convention).
function dailyInterestHtml(balance, annualRatePct, dayBasis){
  if (!(balance > 0)) return '';
  const perDiem = balance * (annualRatePct / 100) / dayBasis;
  const start = new Date();
  const rows = [];
  for (let d = 1; d <= 30; d++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d - 1);
    rows.push([d, date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), fmtMoney(balance, 2), fmtMoney(perDiem, 2), fmtMoney(perDiem * d, 2)]);
  }
  return `<p class="print-report-note">${fmtMoney(balance, 2)} &times; ${annualRatePct.toFixed(3)}% &divide; ${dayBasis} days = <strong>${fmtMoney(perDiem, 2)} per day</strong>. Simple interest; the balance stays the same until the first payment.</p>` +
    printTable(['Day', 'Date', 'Balance', 'Daily interest', 'Interest to date'], rows);
}
function printSchedule(rows){
  if (reportOpts.schedule === 'none' || !rows.length) return '';
  const title = reportOpts.schedule === 'monthly' ? 'Every payment (' + rows.length + ' payments)' : SCHEDULE_TITLES[reportOpts.schedule];
  return printSectionTitle(title) + scheduleTableHtml(rows, reportOpts.schedule);
}
function printDailyInterest(balance, annualRatePct, dayBasis){
  return reportOpts.daily && balance > 0 ? printSectionTitle(SCHEDULE_TITLES.daily) + dailyInterestHtml(balance, annualRatePct, dayBasis) : '';
}

// ---- on-screen schedule viewer (same views as the report) ----
let screenSchedule = 'annual';
let screenScheduleArgs = null;
function scheduleViewerBody(){
  const { rows, balance, rate, basis, annualHtml } = screenScheduleArgs;
  if (screenSchedule === 'daily') return dailyInterestHtml(balance, rate, basis);
  return screenSchedule === 'annual' && annualHtml ? annualHtml : scheduleTableHtml(rows, screenSchedule);
}
// annualHtml: the step's own richer year table (strips, balloon marker) for the Annual view.
function renderScheduleViewer(rows, balance, rate, basis, csvId, annualHtml){
  screenScheduleArgs = { rows, balance, rate, basis, annualHtml };
  const tabs = Object.keys(SCHEDULE_TITLES).map(k =>
    `<button type="button" class="chart-tab ${screenSchedule === k ? 'active' : ''}" data-schedule-view="${k}" aria-pressed="${screenSchedule === k}">${SCHEDULE_TITLES[k]}</button>`).join('');
  return `
      <div class="ledger-export">
        <div class="chart-tabs" role="group" aria-label="Schedule detail">${tabs}</div>
        <button class="btn-utility" id="${csvId}" type="button" title="Download the year-by-year schedule as a spreadsheet (CSV)">Export CSV</button>
      </div>
      <div class="ledger-table-wrap schedule-viewer" id="scheduleViewer">${scheduleViewerBody()}</div>`;
}
function wireScheduleViewer(){
  document.querySelectorAll('[data-schedule-view]').forEach(btn => btn.addEventListener('click', () => {
    screenSchedule = btn.dataset.scheduleView;
    document.querySelectorAll('[data-schedule-view]').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    document.getElementById('scheduleViewer').innerHTML = scheduleViewerBody();
  }));
}

function printStep0(){
  const rate = state.bizPrimeRate + state.bizSpread;
  const pi = monthlyPI(state.bizLoanAmount, rate, state.bizAmortYears);
  const annualDebtService = pi*12;
  const dscr = state.bizNOI / annualDebtService;
  const isSba = state.bizLoanType === 'sba7a' || state.bizLoanType === 'sba504';
  const guarantyInfo = isSba ? estimateSbaGuarantyFee(state.bizLoanAmount, state.bizGuarantyPct, state.bizLoanType) : null;
  const annualServiceFee = isSba ? guarantyInfo.annualFee : 0;
  let balloonBalance = null;
  if(state.bizBalloonYears > 0 && state.bizBalloonYears < state.bizAmortYears){
    const fullSchedule = buildAmortization(state.bizLoanAmount, rate, state.bizAmortYears);
    balloonBalance = fullSchedule[Math.min(state.bizBalloonYears*12 - 1, fullSchedule.length-1)].balance;
  }
  const rows = [
    printRow('Loan type', state.bizLoanType === 'sba7a' ? 'SBA 7(a)' : state.bizLoanType === 'sba504' ? 'SBA 504' : 'Conventional Commercial'),
    printRow('Loan amount', fmtMoney(state.bizLoanAmount, 0)),
    printRow('Amortization', state.bizAmortYears + ' years'),
    printRow('Prime rate', state.bizPrimeRate.toFixed(2) + '%'),
    printRow('Lender spread', state.bizSpread.toFixed(2) + '%'),
    printRow('Blended rate', rate.toFixed(2) + '%'),
    printRow('Monthly payment', fmtMoney(pi, 2)),
    printRow('Annual debt service', fmtMoney(annualDebtService, 0)),
    printRow('Annual net operating income', fmtMoney(state.bizNOI, 0)),
    printRow('Debt service coverage (DSCR)', dscr.toFixed(2) + 'x')
  ];
  if(isSba){
    rows.push(printRow(guarantyInfo.kind === '504' ? 'SBA-backed debenture (40%)' : 'SBA guaranty', guarantyInfo.kind === '504' ? fmtMoney(guarantyInfo.guaranteedPortion, 0) : state.bizGuarantyPct + '%'));
    rows.push(printRow('Est. upfront guaranty fee (' + guarantyInfo.feePct + '%)', fmtMoney(guarantyInfo.fee, 0)));
    rows.push(printRow('SBA annual service fee (' + guarantyInfo.annualPct + '%, lender-paid)', fmtMoney(annualServiceFee, 0)));
  }
  if(balloonBalance !== null) rows.push(printRow('Balloon due — year ' + state.bizBalloonYears, fmtMoney(balloonBalance, 0)));
  return printReportShell(`
    <div class="print-report-grid">
      <div class="print-report-card"><span>Monthly payment</span><strong>${fmtMoney(pi, 2)}</strong><small>${rate.toFixed(2)}% blended rate</small></div>
      <div class="print-report-card"><span>Debt service coverage</span><strong>${dscr.toFixed(2)}x</strong><small>${fmtMoney(state.bizNOI, 0)} NOI &divide; ${fmtMoney(annualDebtService, 0)} debt service</small></div>
    </div>
    ${printSectionTitle('Scenario inputs')}
    <div class="print-report-table">${rows.join('')}</div>
    ${printSchedule(buildAmortization(state.bizLoanAmount, rate, state.bizAmortYears))}
    ${printDailyInterest(state.bizLoanAmount, rate, 360)}
  `);
}

function printStep1(){
  const rate = state.bizPrimeRate + state.bizSpread;
  const rows = buildAmortization(state.bizLoanAmount, rate, state.bizAmortYears);
  const totalInterest = rows.reduce((s,r)=>s+r.interest,0);
  return printReportShell(`
    <div class="print-report-grid">
      <div class="print-report-card"><span>Loan amount</span><strong>${fmtMoney(state.bizLoanAmount, 0)}</strong><small>${rate.toFixed(2)}% rate &middot; ${state.bizAmortYears} years</small></div>
      <div class="print-report-card"><span>Total interest over term</span><strong>${fmtMoney(totalInterest, 0)}</strong><small>Paid down over ${rows.length} months</small></div>
    </div>
    ${printSectionTitle('Loan inputs')}
    <div class="print-report-table">
      ${printRow('Loan type', LOAN_TYPE_LABELS[state.bizLoanType] || state.bizLoanType)}
      ${printRow('Loan amount', fmtMoney(state.bizLoanAmount, 0))}
      ${printRow('Prime rate + lender spread', state.bizPrimeRate.toFixed(2) + '% + ' + state.bizSpread.toFixed(2) + '% = ' + rate.toFixed(2) + '%')}
      ${printRow('Amortization', state.bizAmortYears + ' years (' + rows.length + ' payments)')}
      ${printRow('Monthly payment', fmtMoney(monthlyPI(state.bizLoanAmount, rate, state.bizAmortYears), 2))}
      ${printRow('Total of all payments', fmtMoney(state.bizLoanAmount + totalInterest, 0))}
      ${printRow('Total interest', fmtMoney(totalInterest, 0))}
    </div>
    ${printSchedule(rows)}
    ${printDailyInterest(state.bizLoanAmount, rate, 360)}
  `);
}

function printStep2(){
  const rate = state.locPrimeRate + state.locSpread;
  const { rows, overLimitFlag } = buildLocSchedule(state.locLimit, rate, state.locDraws, state.locMonths, state.locPaymentType, state.locMinPercent);
  const totalInterest = rows.reduce((s,r)=>s+r.interest,0);
  const totalDraws = rows.reduce((s,r)=>s+Math.max(0,r.draw),0);
  const currentBalance = rows.length ? rows[rows.length-1].endingBalance : 0;
  const availableCredit = Math.max(0, state.locLimit - currentBalance);
  const drawRows = state.locDraws.map(d => printRow('Month ' + d.month + ' draw / repayment', fmtMoney(d.amount, 0)));
  const table = printTable(
    ['Month','Beginning Balance','Draw / Repay','Interest','Payment','Ending Balance'],
    rows.map(r => [r.month, fmtMoney(r.beginningBalance,0), r.draw !== 0 ? fmtMoney(r.draw,0) : '—', fmtMoney(r.interest,2), fmtMoney(r.payment,2), fmtMoney(r.endingBalance,0)])
  );
  return printReportShell(`
    <div class="print-report-grid">
      <div class="print-report-card"><span>Projected balance (month ${state.locMonths})</span><strong>${fmtMoney(currentBalance, 0)}</strong><small>of ${fmtMoney(state.locLimit, 0)} limit</small></div>
      <div class="print-report-card"><span>Interest over period</span><strong>${fmtMoney(totalInterest, 0)}</strong><small>${fmtMoney(totalDraws, 0)} drawn total</small></div>
      <div class="print-report-card"><span>Available credit</span><strong>${fmtMoney(availableCredit, 0)}</strong><small>${state.locPaymentType === 'percentBalance' ? state.locMinPercent + '% minimum of balance payments' : 'Interest-only payments'}</small></div>
      ${overLimitFlag ? '<div class="print-report-card"><span>Warning</span><strong>Over limit</strong><small>One or more months exceeds the credit limit.</small></div>' : ''}
    </div>
    ${printSectionTitle('Line of credit inputs')}
    <div class="print-report-table">
      ${printRow('Credit limit', fmtMoney(state.locLimit, 0))}
      ${printRow('Prime rate + spread', state.locPrimeRate.toFixed(2) + '% + ' + state.locSpread.toFixed(2) + '% = ' + rate.toFixed(2) + '%')}
      ${printRow('Payment type', state.locPaymentType === 'percentBalance' ? state.locMinPercent + '% of balance minimum' : 'Interest only')}
      ${printRow('Months projected', state.locMonths)}
    </div>
    ${drawRows.length ? printSectionTitle('Draws & repayments') + '<div class="print-report-table">' + drawRows.join('') + '</div>' : ''}
    ${printSectionTitle('Month-by-month schedule')}
    ${table}
  `);
}

function printMortgageResults(principal){
  const m = mortgageMetrics();
  return printSectionTitle('Calculated results') + `
    <div class="print-report-table">
      ${printRow('Loan amount', fmtMoney(principal, 0))}
      ${printRow('Loan-to-value', state.homePrice ? (principal / state.homePrice * 100).toFixed(1) + '%' : '—')}
      ${printRow('Principal &amp; interest', fmtMoney(m.pi, 2))}
      ${printRow('Property tax (monthly)', fmtMoney(m.tax, 2))}
      ${printRow('Home insurance (monthly)', fmtMoney(m.insurance, 2))}
      ${printRow('Total monthly payment (PITI)', fmtMoney(m.total, 2))}
      ${printRow('Total interest over ' + state.term + ' years', fmtMoney(m.interest, 0))}
      ${printRow('Total of all P&amp;I payments', fmtMoney(m.pi * state.term * 12, 0))}
    </div>`;
}
function printMortgageSchedule(principal){
  return printSchedule(buildAmortization(principal, state.rate, state.term, state.extraMonthly, state.balloonAmount, state.balloonMonth)) +
    printDailyInterest(principal, state.rate, 365);
}

function printStep3(){
  const principal = Math.max(0, state.homePrice - state.downPayment);
  const pi = monthlyPI(principal, state.rate, state.term);
  return printReportShell(`
    <div class="print-report-grid">
      <div class="print-report-card"><span>Financed amount</span><strong>${fmtMoney(principal, 0)}</strong><small>${fmtMoney(state.homePrice, 0)} price &minus; ${fmtMoney(state.downPayment, 0)} down</small></div>
      <div class="print-report-card"><span>Principal &amp; interest</span><strong>${fmtMoney(pi, 2)}</strong><small>${state.rate}% for ${state.term} years</small></div>
    </div>
    ${printSectionTitle('Scenario inputs')}
    <div class="print-report-table">
      ${printRow('Home price', fmtMoney(state.homePrice, 0))}
      ${printRow('Down payment', fmtMoney(state.downPayment, 0))}
      ${printRow('Interest rate', state.rate + '%')}
      ${printRow('Loan term', state.term + ' years')}
      ${printRow('Annual property tax', state.taxRate + '% of price')}
      ${printRow('Annual home insurance', fmtMoney(state.insurance, 0))}
    </div>
    ${printMortgageResults(principal)}
    ${printMortgageSchedule(principal)}
  `);
}

function printStep4(){
  const principal = Math.max(0, state.homePrice - state.downPayment);
  const pi = monthlyPI(principal, state.rate, state.term);
  const tax = (state.homePrice * state.taxRate / 100) / 12;
  const insurance = state.insurance / 12;
  const total = pi + tax + insurance;
  return printReportShell(`
    <div class="print-report-grid">
      <div class="print-report-card"><span>Total monthly payment</span><strong>${fmtMoney(total, 2)}</strong><small>PITI on ${fmtMoney(principal, 0)} financed</small></div>
      <div class="print-report-card"><span>Lifetime interest (${state.term} yrs)</span><strong>${fmtMoney(pi*state.term*12 - principal, 0)}</strong><small>${state.rate}% fixed</small></div>
    </div>
    ${printSectionTitle('Payment breakdown')}
    <div class="print-report-table">
      ${printRow('Principal &amp; interest', fmtMoney(pi, 2))}
      ${printRow('Property tax (est.)', fmtMoney(tax, 2))}
      ${printRow('Home insurance (est.)', fmtMoney(insurance, 2))}
      ${printRow('Total monthly payment', fmtMoney(total, 2))}
      ${printRow('Loan amount', fmtMoney(principal, 0))}
      ${printRow('Total interest paid', fmtMoney(pi*state.term*12 - principal, 0))}
    </div>
    ${printMortgageSchedule(principal)}
  `);
}

function printStep5(){
  const principal = Math.max(0, state.homePrice - state.downPayment);
  const baseRows = buildAmortization(principal, state.rate, state.term);
  const baseInterest = baseRows.reduce((s,r)=>s+r.interest,0);
  const baseMonths = baseRows.length;
  const rows = buildAmortization(principal, state.rate, state.term, state.extraMonthly, state.balloonAmount, state.balloonMonth);
  const actualInterest = rows.reduce((s,r)=>s+r.interest,0);
  const actualMonths = rows.length;
  const interestSaved = baseInterest - actualInterest;
  const monthsSaved = baseMonths - actualMonths;
  const hasExtra = state.extraMonthly > 0 || state.balloonAmount > 0;
  const payoffYears = Math.floor(actualMonths/12);
  const payoffMonthsRem = actualMonths % 12;
  return printReportShell(`
    <div class="print-report-grid">
      <div class="print-report-card"><span>Monthly P&amp;I</span><strong>${fmtMoney(monthlyPI(principal, state.rate, state.term), 2)}</strong><small>${fmtMoney(principal, 0)} at ${state.rate}% for ${state.term} years</small></div>
      <div class="print-report-card"><span>Payoff</span><strong>${payoffYears} yr${payoffMonthsRem ? ' ' + payoffMonthsRem + ' mo' : ''}</strong><small>vs. ${state.term}-year original${hasExtra ? ' &middot; ' + fmtMoney(interestSaved, 0) + ' interest saved' : ''}</small></div>
      <div class="print-report-card"><span>Extra monthly payment</span><strong>${fmtMoney(state.extraMonthly, 0)}</strong><small>${hasExtra ? monthsSaved + ' months earlier' : 'None applied'}</small></div>
      <div class="print-report-card"><span>One-time extra payment</span><strong>${state.balloonAmount > 0 ? fmtMoney(state.balloonAmount, 0) + ' in mo ' + state.balloonMonth : 'None'}</strong><small>${state.balloonAmount > 0 ? fmtMoney(interestSaved, 0) + ' interest saved' : 'Not applied'}</small></div>
    </div>
    ${printSectionTitle('Loan inputs')}
    <div class="print-report-table">
      ${printRow('Home price', fmtMoney(state.homePrice, 0))}
      ${printRow('Down payment', fmtMoney(state.downPayment, 0))}
      ${printRow('Loan amount', fmtMoney(principal, 0))}
      ${printRow('Interest rate', state.rate + '%')}
      ${printRow('Loan term', state.term + ' years')}
      ${printRow('Extra monthly payment', fmtMoney(state.extraMonthly, 0))}
      ${printRow('Total interest (with extras)', fmtMoney(actualInterest, 0))}
      ${printRow('Total interest (no extras)', fmtMoney(baseInterest, 0))}
    </div>
    ${printMortgageSchedule(principal)}
  `);
}

function printStep6(){
  const rm = refiMetrics(state);
  const { principal, balance, currentPI, newPI, monthlySavings } = rm;
  return printReportShell(`
    <div class="print-report-grid">
      <div class="print-report-card"><span>Current monthly P&amp;I</span><strong>${fmtMoney(currentPI, 2)}</strong><small>${state.rate}% &middot; ${fmt(rm.remainingMonths/12, 1)} years left</small></div>
      <div class="print-report-card"><span>Refinanced monthly P&amp;I</span><strong>${fmtMoney(newPI, 2)}</strong><small>${state.newRate}% &middot; ${state.newTerm} years</small></div>
      <div class="print-report-card"><span>Monthly change</span><strong>${monthlySavings >= 0 ? '&minus;' + fmtMoney(monthlySavings, 2) : '+' + fmtMoney(Math.abs(monthlySavings), 2)}</strong><small>${monthlySavings >= 0 ? 'lower payment' : 'higher payment'}</small></div>
      <div class="print-report-card"><span>Break-even</span><strong>${rm.breakEvenMonths === null ? 'n/a' : fmt(rm.breakEvenMonths, 1) + ' mo'}</strong><small>on ${fmtMoney(state.refiClosingCosts, 0)} closing costs</small></div>
    </div>
    ${printSectionTitle('Comparison on a ' + fmtMoney(balance, 0) + ' balance')}
    <div class="print-report-table">
      ${printRow('Original loan amount', fmtMoney(principal, 0))}
      ${printRow('Years already paid', state.refiYearsPaid + ' years')}
      ${printRow('Balance today', fmtMoney(balance, 0))}
      ${printRow('Current rate', state.rate + '%')}
      ${printRow('Interest still to pay on current loan', fmtMoney(rm.remainingInterestCurrent, 0))}
      ${printRow('New rate', state.newRate + '%')}
      ${printRow('New term', state.newTerm + ' years')}
      ${printRow('New monthly P&amp;I', fmtMoney(newPI, 2))}
      ${printRow('Interest over new term', fmtMoney(rm.newInterest, 0))}
      ${printRow('Closing costs', fmtMoney(state.refiClosingCosts, 0))}
      ${printRow('Net ' + (rm.totalCostChange >= 0 ? 'saving' : 'cost') + ' after closing costs', fmtMoney(Math.abs(rm.totalCostChange), 0))}
    </div>
  `);
}

function printStep7(){
  const am = affordMetrics(state);
  const { monthlyIncome, maxHousingPayment, budgetPITI: budgetForPI, maxPrincipal, maxHomePrice } = am;
  const currentDebtToIncome = am.backEndDti;
  return printReportShell(`
    <div class="print-report-grid">
      <div class="print-report-card"><span>Estimated affordable home price</span><strong>${fmtMoney(maxHomePrice, 0)}</strong><small>${fmtMoney(state.affordDownPayment, 0)} down available</small></div>
      <div class="print-report-card"><span>Debt-to-income ratio</span><strong>${currentDebtToIncome.toFixed(1)}%</strong><small>Lenders typically target 36% or below</small></div>
    </div>
    ${printSectionTitle('Affordability inputs')}
    <div class="print-report-table">
      ${printRow('Annual household income', fmtMoney(state.income, 0))}
      ${printRow('Other monthly debt payments', fmtMoney(state.monthlyDebts, 0))}
      ${printRow('Available down payment', fmtMoney(state.affordDownPayment, 0))}
      ${printRow('Assumed interest rate', state.affordRate + '%')}
      ${printRow('Monthly income', fmtMoney(monthlyIncome, 0))}
      ${printRow('Max housing payment (28% rule)', fmtMoney(maxHousingPayment, 0))}
      ${printRow('Housing payment budget incl. tax &amp; insurance (28/36 rule)', fmtMoney(Math.max(0, budgetForPI), 0))}
      ${printRow('Maximum loan amount (30-yr)', fmtMoney(maxPrincipal, 0))}
      ${printRow('Estimated affordable home price', fmtMoney(maxHomePrice, 0))}
    </div>
  `);
}

function printStep8(){
  const data = marketNewsState.data;
  const rates = data && data.rates;
  let body;
  if (rates && rates.cells && rates.cells.length) {
    body = `
        <div class="print-report-grid">${rates.cells.map(c => `<div class="print-report-card"><span>${escapeHtml(c.label)}</span><strong>${escapeHtml(c.value)}</strong>${c.note ? '<small>' + escapeHtml(c.note) + '</small>' : ''}</div>`).join('')}</div>
      ${printSectionTitle('National averages')}
      <div class="print-report-table">${rates.cells.map(c => printRow(c.label, c.value + (c.note ? ' — ' + c.note : ''))).join('')}</div>
      <p class="print-report-foot">${escapeHtml(rates.disclaimer || 'National averages. Individual rates vary. Not a rate quote.')}${rates.asOf ? ' As of ' + escapeHtml(rates.asOf) + (rates.source ? ' (' + escapeHtml(rates.source) + ')' : '') + '.' : ''}</p>
    `;
  } else {
    body = `
        <p>Live rate data has not loaded yet. Reopen Market News and wait for the feed to finish, or print from a calculator step instead.</p>
    `;
  }
  return printReportShell(body);
}

function renderPrintReport(){
  const builders = [printStep0, printStep1, printStep2, printStep3, printStep4, printStep5, printStep6, printStep7, printStep8];
  return builders[state.step]();
}

function shareableUrl(){
  const url = new URL(window.location.href);
  url.searchParams.delete('step');
  url.searchParams.set('lf', JSON.stringify(state));
  return url.toString();
}

async function copyShareLink(){
  const url = shareableUrl();
  try {
    await navigator.clipboard.writeText(url);
  } catch (_) {
    const input = document.createElement('textarea');
    input.value = url;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
  const status = document.getElementById('workflowStatus');
  if (status) status.textContent = 'Share link copied';
}

function loadSharedState(){
  const raw = new URLSearchParams(window.location.search).get('lf');
  if (!raw) return false;
  try {
    const incoming = JSON.parse(raw);
    Object.keys(state).forEach(key => {
      if (!(key in incoming)) return;
      if (key === 'locDraws') {
        if (Array.isArray(incoming[key])) state[key] = incoming[key].filter(draw => draw && Number.isFinite(Number(draw.month)) && Number.isFinite(Number(draw.amount))).map(draw => ({ id: Number(draw.id), month: Number(draw.month), amount: Number(draw.amount) }));
      } else if (typeof state[key] === 'number') {
        if (Number.isFinite(Number(incoming[key]))) state[key] = Number(incoming[key]);
      } else if (typeof incoming[key] === 'string') {
        if (!STATE_ENUMS[key] || STATE_ENUMS[key].includes(incoming[key])) state[key] = incoming[key];
      }
    });
    return true;
  } catch (_) {
    // Ignore malformed shared links and keep the defaults.
    return false;
  }
}

// ---------- SCENARIO PINS: COMPARE ----------
function loadPinnedScenarios(){
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}
function savePinnedScenarios(){
  try { localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinnedScenarios)); } catch (_) {}
}
function pinCurrentScenario(){
  const snapshot = {};
  Object.keys(state).forEach(key => {
    if (key === 'locDraws') snapshot[key] = state[key].map(d => ({ id: Number(d.id), month: Number(d.month), amount: Number(d.amount) }));
    else snapshot[key] = state[key];
  });
  const label = steps[state.step] + ' · ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  pinnedScenarios.unshift({ id: Date.now() + pinSeq++, label, step: state.step, state: snapshot, createdAt: new Date().toISOString() });
  pinnedScenarios = pinnedScenarios.slice(0, 12);
  savePinnedScenarios();
}
function deletePinnedScenario(id){
  pinnedScenarios = pinnedScenarios.filter(p => p.id !== id);
  savePinnedScenarios();
}
function clearPinnedScenarios(){
  pinnedScenarios = [];
  savePinnedScenarios();
}
function loadPinnedScenario(pin){
  Object.keys(state).forEach(key => {
    if (!(key in pin.state)) return;
    if (key === 'locDraws') {
      if (Array.isArray(pin.state[key])) state[key] = pin.state[key].filter(d => d && Number.isFinite(Number(d.month)) && Number.isFinite(Number(d.amount))).map(d => ({ id: Number(d.id), month: Number(d.month), amount: Number(d.amount) }));
    } else if (typeof state[key] === 'number') {
      if (Number.isFinite(Number(pin.state[key]))) state[key] = Number(pin.state[key]);
    } else if (typeof pin.state[key] === 'string') {
      if (!STATE_ENUMS[key] || STATE_ENUMS[key].includes(pin.state[key])) state[key] = pin.state[key];
    }
  });
  state.step = (Number.isInteger(pin.step) && pin.step >= 0 && pin.step <= 8) ? pin.step : 0;
  render();
}
const LOAN_TYPE_LABELS = { sba7a: 'SBA 7(a)', sba504: 'SBA 504', conventional: 'Conventional' };
// Rows shown in the compare table. `best` marks which direction wins so the
// table can highlight it ('low' = smaller is better).
function scenarioStats(pin){
  const s = pin.state;
  if (pin.step === 0 || pin.step === 1){
    const m = businessMetrics(s);
    return [
      { label: 'Loan type', value: LOAN_TYPE_LABELS[s.bizLoanType] || s.bizLoanType },
      { label: 'Loan amount', value: fmtMoney(s.bizLoanAmount, 0) },
      { label: 'Loan length', value: s.bizAmortYears + ' yrs' },
      { label: 'Total rate', value: m.rate.toFixed(2) + '%', num: m.rate, best: 'low' },
      { label: 'Monthly payment', value: fmtMoney(m.payment, 0), num: m.payment, best: 'low' },
      { label: 'Total interest', value: fmtMoney(m.payment * s.bizAmortYears * 12 - s.bizLoanAmount, 0), num: m.payment * s.bizAmortYears * 12 - s.bizLoanAmount, best: 'low' },
      { label: 'DSCR', value: m.dscr.toFixed(2) + 'x', num: m.dscr, best: 'high' }
    ];
  }
  if (pin.step === 2){
    const m = locMetrics(s);
    return [
      { label: 'Credit limit', value: fmtMoney(s.locLimit, 0) },
      { label: 'Total rate', value: m.rate.toFixed(2) + '%', num: m.rate, best: 'low' },
      { label: 'Projected balance', value: fmtMoney(m.balance, 0) },
      { label: 'Interest / period', value: fmtMoney(m.interest, 0), num: m.interest, best: 'low' },
      { label: 'Available credit', value: fmtMoney(m.available, 0), num: m.available, best: 'high' }
    ];
  }
  const m = mortgageMetrics(s);
  return [
    { label: 'Home price', value: fmtMoney(s.homePrice, 0) },
    { label: 'Down payment', value: fmtMoney(s.downPayment, 0) },
    { label: 'Loan amount', value: fmtMoney(m.principal, 0) },
    { label: 'Rate', value: s.rate + '%', num: s.rate, best: 'low' },
    { label: 'Loan length', value: s.term + ' yrs' },
    { label: 'Monthly PITI', value: fmtMoney(m.total, 0), num: m.total, best: 'low' },
    { label: 'Lifetime interest', value: fmtMoney(m.interest, 0), num: m.interest, best: 'low' }
  ];
}
function renderCompareTable(){
  const cols = [...pinnedScenarios].reverse().map(p => ({ pin: p, stats: scenarioStats(p) }));  // oldest first
  const labels = [];
  cols.forEach(c => c.stats.forEach(st => { if (!labels.includes(st.label)) labels.push(st.label); }));
  const head = cols.map((c, i) => `
    <th scope="col">
      <div class="workflow-kicker">Scenario ${i + 1}</div>
      <strong>${escapeHtml(c.pin.label)}</strong>
      <div class="compare-card-actions">
        <button class="btn-utility" type="button" data-load-pin="${c.pin.id}">Load</button>
        <button class="btn-utility" type="button" data-delete-pin="${c.pin.id}" aria-label="Delete scenario ${i + 1}">&times;</button>
      </div>
    </th>`).join('');
  const body = labels.map(label => {
    const cells = cols.map(c => c.stats.find(st => st.label === label));
    const nums = cells.filter(st => st && st.best && Number.isFinite(st.num)).map(st => st.num);
    const bestVal = nums.length > 1 ? (cells.find(st => st && st.best).best === 'low' ? Math.min(...nums) : Math.max(...nums)) : null;
    const tds = cells.map(st => {
      if (!st) return '<td class="compare-na">—</td>';
      const win = bestVal !== null && st.num === bestVal && new Set(nums).size > 1;
      return `<td${win ? ' class="compare-best"' : ''}>${st.value}${win ? ' <span class="compare-best-tag">best</span>' : ''}</td>`;
    }).join('');
    return `<tr><th scope="row">${label}</th>${tds}</tr>`;
  }).join('');
  return `<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function renderCompareModal(){
  const n = pinnedScenarios.length;
  const guide = n === 0
    ? '<div class="compare-empty"><p><strong>How it works:</strong> 1) Set up a scenario in any calculator and click <em>+ Pin this scenario</em>. 2) Change something — loan type, amount, rate, or length — and pin again. 3) Come back here to see them side by side, with the better number highlighted.</p></div>'
    : n === 1
      ? '<div class="compare-empty"><p>One scenario pinned. Close this, change a number (for example 7(a) vs. 504, or 30 vs. 15 years), then click <em>+ Pin this scenario</em> again to compare.</p></div>'
      : '';
  return `
    <div class="compare-modal" id="compareModal" role="dialog" aria-modal="true" aria-labelledby="compareTitle">
      <div class="compare-modal-inner">
        <div class="compare-modal-head">
          <div>
            <div class="workflow-kicker">Scenario lab</div>
            <h2 id="compareTitle">Compare scenarios</h2>
          </div>
          <button class="legal-modal-close" type="button" id="compareModalClose">Close</button>
        </div>
        <p class="compare-note">Pins are saved in this browser only. <em>Load</em> puts a scenario back into its calculator. Up to 12 can be pinned.</p>
        <div class="compare-actions">
          <button class="btn-utility btn-utility--accent" type="button" id="pinCurrentScenario">+ Pin current scenario</button>
          ${n ? '<button class="btn-utility" type="button" id="clearPinnedScenarios">Clear all</button>' : ''}
        </div>
        ${guide}
        ${n ? renderCompareTable() : ''}
      </div>
    </div>`;
}
function printCurrentReport(){
  let mount = document.getElementById('printReportMount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'printReportMount';
    document.body.appendChild(mount);
  }
  mount.innerHTML = renderPrintReport();
  document.body.classList.add('printing-report');
  window.setTimeout(() => window.print(), 0);
  window.onafterprint = () => {
    document.body.classList.remove('printing-report');
    mount.innerHTML = '';
  };
}
function openReportOptions(){
  let mount = document.getElementById('reportOptionsMount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'reportOptionsMount';
    document.body.appendChild(mount);
  }
  const opt = (value, title, note) => `
    <label class="report-opt"><input type="radio" name="reportSchedule" value="${value}" ${reportOpts.schedule === value ? 'checked' : ''}>
      <span><strong>${title}</strong><small>${note}</small></span></label>`;
  mount.innerHTML = `
    <div class="compare-modal open" id="reportOptions" role="dialog" aria-modal="true" aria-labelledby="reportOptionsTitle">
      <div class="compare-modal-inner report-options-inner">
        <div class="compare-modal-head">
          <div><div class="workflow-kicker">PDF report</div><h2 id="reportOptionsTitle">What should the report include?</h2></div>
          <button class="legal-modal-close" type="button" id="reportOptionsClose">Close</button>
        </div>
        ${SCHEDULE_STEPS.includes(state.step) ? `<fieldset class="report-opts"><legend>Amortization schedule</legend>
          ${opt('none', 'Summary only', 'Key numbers and inputs, no schedule')}
          ${opt('annual', 'Annual summary', 'One row per year')}
          ${opt('quarterly', 'Quarterly', 'One row per quarter')}
          ${opt('monthly', 'Every payment', 'Each monthly payment for the full term — long for 30-year loans')}
        </fieldset>
        <label class="report-opt report-opt--check"><input type="checkbox" id="reportDaily" ${reportOpts.daily ? 'checked' : ''}>
          <span><strong>Add 30 days of daily interest</strong><small>Per-diem interest accrual starting today — useful for payoffs and closing dates</small></span></label>` : ''}
        <fieldset class="report-opts"><legend>Print style</legend>
          <label class="report-opt"><input type="radio" name="reportColor" value="color" ${reportOpts.color ? 'checked' : ''}><span><strong>Color</strong><small>Brand colors and shaded rows</small></span></label>
          <label class="report-opt"><input type="radio" name="reportColor" value="bw" ${reportOpts.color ? '' : 'checked'}><span><strong>Black &amp; white</strong><small>Saves ink; best for office printers</small></span></label>
        </fieldset>
        <div class="compare-actions"><button class="btn-utility btn-utility--accent" type="button" id="reportOptionsGo">Create PDF</button></div>
        <p class="compare-note">Your print dialog will open — choose <em>Save as PDF</em> as the destination.</p>
      </div>
    </div>`;
  const modal = document.getElementById('reportOptions');
  const close = () => { mount.innerHTML = ''; };
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.getElementById('reportOptionsClose').addEventListener('click', close);
  document.getElementById('reportOptionsGo').addEventListener('click', () => {
    const picked = modal.querySelector('input[name="reportSchedule"]:checked');
    if (picked) reportOpts.schedule = picked.value;
    const daily = document.getElementById('reportDaily');
    if (daily) reportOpts.daily = daily.checked;
    reportOpts.color = modal.querySelector('input[name="reportColor"]:checked').value === 'color';
    close();
    printCurrentReport();
  });
}
function openCompareModal(){
  let mount = document.getElementById('compareModalMount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'compareModalMount';
    document.body.appendChild(mount);
  }
  mount.innerHTML = renderCompareModal();
  wireCompareModal();
  document.getElementById('compareModal').classList.add('open');
}
function wireCompareModal(){
  const modal = document.getElementById('compareModal');
  if (!modal) return;
  const close = () => { modal.classList.remove('open'); render(); };
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  const closeBtn = document.getElementById('compareModalClose');
  if (closeBtn) closeBtn.addEventListener('click', close);
  const pinBtn = document.getElementById('pinCurrentScenario');
  if (pinBtn) pinBtn.addEventListener('click', () => { pinCurrentScenario(); openCompareModal(); });
  const clearBtn = document.getElementById('clearPinnedScenarios');
  if (clearBtn) clearBtn.addEventListener('click', () => { clearPinnedScenarios(); openCompareModal(); });
  document.querySelectorAll('[data-load-pin]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pin = pinnedScenarios.find(p => p.id === Number(btn.dataset.loadPin));
      if (!pin) return;
      loadPinnedScenario(pin);
      modal.classList.remove('open');
    });
  });
  document.querySelectorAll('[data-delete-pin]').forEach(btn => {
    btn.addEventListener('click', () => {
      deletePinnedScenario(Number(btn.dataset.deletePin));
      openCompareModal();
    });
  });
}

function wireChartInteractions(){
  document.querySelectorAll('.chart-segment, .chart-point').forEach(el => {
    const tooltip = el.closest('.chart-card').querySelector('.chart-tooltip');
    const show = () => { tooltip.textContent = `${el.dataset.chartLabel}: ${el.dataset.chartValue}`; tooltip.classList.add('visible'); el.classList.add('active'); };
    const hide = () => { tooltip.classList.remove('visible'); el.classList.remove('active'); };
    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', show);
    el.addEventListener('blur', hide);
  });
  document.querySelectorAll('.chart-legend-item').forEach(button => {
    button.addEventListener('click', () => {
      const target = [...document.querySelectorAll('.chart-segment')].find(segment => segment.dataset.chartLabel === button.dataset.chartTarget);
      if (target) target.dispatchEvent(new Event('mouseenter'));
    });
  });
}

// ---------- RENDER: NAV ----------
/** Standard in-content unit — after first calculator panel (FamFlow: tools_incontent). */
function adInContent(){
  return `<div class="ad-slot ad-slot--incontent" data-ad-format="rectangle" data-ad-name="tools-incontent"></div>`;
}

/** In-article fluid unit for long-form / news sections. */
function adInArticle(name){
  return `<div class="ad-slot ad-slot--article" data-ad-format="fluid" data-ad-layout="in-article" data-ad-name="${name || 'tools-inarticle'}"></div>`;
}

/** Multiplex / matched-content style unit. */
function adMultiplex(name){
  return `<div class="ad-slot ad-slot--multiplex" data-ad-format="multipurpose" data-ad-name="${name || 'tools-multiplex'}"></div>`;
}

function renderNav(){
  const nav = document.getElementById('stepNav');
  nav.innerHTML = steps.map((s,i)=>`
    <li class="step ${state.introDone && i===state.step?'active':''}" data-idx="${i}">
      <span class="step-no">${String(i+1).padStart(2,'0')}</span>
      <span class="step-label">${s}</span>
    </li>
  `).join('');
  nav.querySelectorAll('.step').forEach(el=>{
    el.addEventListener('click', ()=>{ state.step = parseInt(el.dataset.idx); state.introDone = true; render(); });
  });
}

// ---------- RENDER: STEP 0 — LOAN DETAILS ----------
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

    ${adInContent()}

    <div class="panel" style="margin-top:2rem;">
      <div class="article">
        <h2>How a Mortgage Payment Is Actually Calculated</h2>
        <p>Your monthly mortgage payment is usually made up of four parts, often shortened to <strong>PITI</strong>: principal, interest, taxes, and insurance. Principal is the portion that pays down the amount you borrowed. Interest is the lender's charge for lending you the money, calculated each month on whatever balance remains. Property tax and homeowners insurance are collected monthly and held in an escrow account, then paid on your behalf when the bills come due once or twice a year.</p>
        <p>In the early years of a loan, most of each payment goes toward interest rather than principal, because interest is calculated on a much larger remaining balance. As the balance shrinks, the interest portion shrinks with it and more of each payment starts paying down principal — this shift is what the Amortization Ledger step visualizes.</p>

        <h2>Fixed-Rate vs. Adjustable-Rate Mortgages</h2>
        <p>A <strong>fixed-rate mortgage</strong> locks in the same interest rate for the entire loan term, so the principal-and-interest portion of your payment never changes. This calculator assumes a fixed rate, which is the most common structure for 30-year and 15-year home loans in the U.S.</p>
        <p>An <strong>adjustable-rate mortgage (ARM)</strong> starts with a lower introductory rate for a set period — commonly 5, 7, or 10 years — then adjusts periodically based on a market index. ARMs can make sense for buyers who plan to sell or refinance before the adjustment period begins, but they carry more long-term uncertainty than a fixed-rate loan.</p>

        <h2>What Affects the Interest Rate You're Offered</h2>
        <ul>
          <li><strong>Credit score</strong> — generally the single largest factor lenders weigh</li>
          <li><strong>Down payment size</strong> — a larger down payment reduces the lender's risk and often earns a better rate</li>
          <li><strong>Loan term</strong> — shorter terms (like 15 years) typically carry lower rates than 30-year loans, since the lender's money is at risk for less time</li>
          <li><strong>Debt-to-income ratio</strong> — how much of your monthly income already goes to existing debt</li>
          <li><strong>Loan type</strong> — conventional, FHA, VA, and USDA loans each have different rate and qualification structures</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">How much down payment do I actually need?<span class="mark">+</span></div>
          <div class="faq-a">Conventional loans often allow as little as 3–5% down, FHA loans allow as little as 3.5%, and VA or USDA loans can allow 0% down for eligible borrowers. Putting down less than 20% on a conventional loan typically means paying private mortgage insurance (PMI) until you build enough equity.</div>
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
          <div class="faq-a">The interest rate is what's applied to your loan balance to calculate interest. The APR (Annual Percentage Rate) also factors in certain lender fees and closing costs, spread over the loan term — which is why APR is usually slightly higher than the quoted rate, and is meant to help you compare offers between lenders on an apples-to-apples basis.</div>
        </div>
      </div>
    </div>
  `;
}

// ---------- RENDER: STEP 1 — RESULTS ----------
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
        <div class="line-item"><span>Loan Amount</span><span class="num">${fmtMoney(principal,0)}</span></div>
        <div class="line-item"><span>Total Interest Paid (${state.term} yrs)</span><span class="num">${fmtMoney(pi*state.term*12 - principal,0)}</span></div>      </div>

      ${renderPaymentMixChart(pi, monthlyTax, monthlyIns, total)}

      <div class="actions">
        <button class="btn-ghost" id="backTo0">&larr; Back</button>
        <button class="btn-primary" id="toAmort">View Amortization Ledger &rarr;</button>
      </div>
    </div>

    ${adInContent()}
  `;
}

// ---------- RENDER: STEP 2 — AMORTIZATION ----------
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

  // group by year for the summary strip — uses actual (possibly shortened) schedule
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
    <p class="sub">How each payment splits between principal and interest over the life of the loan — and how your remaining balance shrinks year by year.</p>

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
        <div class="label">Payoff In ${payoffYears} yr${payoffMonthsRem?' '+payoffMonthsRem+' mo':''} — vs. ${state.term} yr Original</div>
        <div class="value">${fmtMoney(interestSaved,0)} interest saved${monthsSaved>0 ? ' &middot; '+monthsSaved+' months earlier' : ''}</div>
      </div>
      ` : ''}

      ${renderBalanceChart(yearRows, state.amortChartMode)}

      ${renderScheduleViewer(buildAmortization(principal, state.rate, state.term, state.extraMonthly, state.balloonAmount, state.balloonMonth), principal, state.rate, 365, 'exportCsvAmort', `<table><thead><tr><th>Year</th><th>Principal Paid</th><th>Interest Paid</th><th>Remaining Balance</th></tr></thead><tbody>${tableRows}</tbody></table>`)}
      <div class="actions">
        <button class="btn-ghost" id="backTo1">&larr; Back</button>
        <button class="btn-primary" id="toRefi">Compare Refinance Options &rarr;</button>
      </div>
    </div>

    ${adInContent()}
  `;
}

// ---------- RENDER: STEP 3 — REFINANCE ----------
function renderStep3(){
  const rm = refiMetrics(state);
  const { principal, balance, currentPI, newPI, monthlySavings } = rm;
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

      <div class="field-grid" style="padding-top:0; padding-bottom:0;">
        <div class="field">
          <label for="refiYearsPaid">Years Already Paid</label>
          <div class="input-wrap"><input id="refiYearsPaid" type="number" value="${state.refiYearsPaid}" min="0" max="${state.term-1}" step="1"><span>years</span></div>
        </div>
        <div class="field">
          <label for="refiClosingCosts">Refinance Closing Costs</label>
          <div class="input-wrap"><span>$</span><input id="refiClosingCosts" type="number" value="${state.refiClosingCosts}" min="0" step="250"></div>
        </div>
      </div>

      <div class="compare-grid">
        <div class="compare-col">
          <h3>Current Loan (remaining)</h3>
          <div class="compare-row"><span>Rate</span><span class="num">${state.rate}%</span></div>
          <div class="compare-row"><span>Time left</span><span class="num">${fmt(rm.remainingMonths/12,1)} yrs</span></div>
          <div class="compare-row"><span>Balance today</span><span class="num">${fmtMoney(balance,0)}</span></div>
          <div class="compare-row"><span>Monthly P&amp;I</span><span class="num">${fmtMoney(currentPI,2)}</span></div>
          <div class="compare-row"><span>Interest still to pay</span><span class="num">${fmtMoney(rm.remainingInterestCurrent,0)}</span></div>
        </div>
        <div class="compare-col new">
          <h3>Refinanced Loan</h3>
          <div class="compare-row"><span>Rate</span><span class="num">${state.newRate}%</span></div>
          <div class="compare-row"><span>Term</span><span class="num">${state.newTerm} yrs</span></div>
          <div class="compare-row"><span>New loan amount</span><span class="num">${fmtMoney(balance,0)}</span></div>
          <div class="compare-row"><span>Monthly P&amp;I</span><span class="num">${fmtMoney(newPI,2)}</span></div>
          <div class="compare-row"><span>Interest over new term</span><span class="num">${fmtMoney(rm.newInterest,0)}</span></div>
        </div>
      </div>

      <div class="savings-callout">
        <div class="label">Estimated Monthly Savings</div>
        <div class="value">${monthlySavings >= 0 ? fmtMoney(monthlySavings,2)+' / month' : '&minus;'+fmtMoney(Math.abs(monthlySavings),2)+' / month'}</div>
      </div>
      <div class="breakdown" style="padding-top:0;">
        <div class="line-item"><span>Break-even on closing costs</span><span class="num">${rm.breakEvenMonths === null ? 'No monthly savings' : fmt(rm.breakEvenMonths,1)+' months'}</span></div>
        <div class="line-item"><span>Interest ${rm.interestChange >= 0 ? 'saved' : 'added'} (before closing costs)</span><span class="num">${fmtMoney(Math.abs(rm.interestChange),0)}</span></div>
        <div class="line-item"><span>Net ${rm.totalCostChange >= 0 ? 'saving' : 'cost'} after closing costs</span><span class="num">${fmtMoney(Math.abs(rm.totalCostChange),0)}</span></div>
      </div>
      <p style="padding:0 2rem 1.5rem; font-size:0.78rem; color:var(--muted); font-family:'Inter',sans-serif;">
        Compares what you still owe on the current loan with a new loan for that balance, paying the closing costs out of pocket. A longer new term can lower the payment while adding interest, so check both the break-even and the interest figures.
      </p>

      <div class="actions" style="padding-top:0;">
        <button class="btn-ghost" id="backTo2">&larr; Back</button>
        <button class="btn-primary" id="toAfford">Check Affordability &rarr;</button>
      </div>
    </div>

    ${adInContent()}
  `;
}

// ---------- RENDER: STEP 4 — AFFORDABILITY ----------
function renderStep4(){
  const am = affordMetrics(state);
  const { monthlyIncome, maxHousingPayment, budgetPITI: budgetForPI, maxPrincipal, maxHomePrice } = am;
  const currentDebtToIncome = am.backEndDti;
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
        <div class="label" style="font-family:'Inter',sans-serif; font-size:0.72rem; font-weight:400; text-transform:uppercase; letter-spacing:0.12em; color:var(--muted); margin-bottom:0.4rem;">Estimated Home Price You Could Afford</div>
        <div class="value">${fmtMoney(maxHomePrice,0)}</div>
        <div class="dti-bar"><div class="fill" style="width:${Math.min(currentDebtToIncome,100)}%; background:${dtiColor};"></div></div>
        <div class="dti-note">Estimated debt-to-income ratio: ${currentDebtToIncome.toFixed(1)}% (lenders typically look for 36% or below, up to 43% for some loan types)</div>
        <div class="dti-note" style="margin-top:0.5rem;">Assumes a 30-year loan, property tax of ${state.taxRate}% of price and homeowner's insurance of ${fmtMoney(state.insurance,0)}/year (edit these in Mortgage Details). Housing payment budget: ${fmtMoney(budgetForPI,0)}/month. Mortgage insurance and HOA dues are not included.</div>
      </div>

      <div class="actions" style="padding-top:0;">
        <button class="btn-ghost" id="backTo3">&larr; Back</button>
        <button class="btn-primary" id="toStart">Start a New Calculation &rarr;</button>
      </div>
    </div>

    ${adInContent()}
  `;
}

// Official FY 2027 SBA fee rules (effective Oct 1, 2026): Information Notice 5000-881797 (7(a)) and 5000-881796 (504).
// 7(a): the tier comes from the GROSS loan amount; the percentage applies to the guaranteed portion.
//   <= $150,000: 2%   |   $150,001-$700,000: 3%   |   $700,001-$5M: 3.5% of the guaranteed portion up to $1M + 3.75% above $1M.
//   The lender's annual service fee (0.55% of the guaranteed balance) is paid by the lender and cannot be billed to the borrower.
//   Manufacturers, food supply chain and rural businesses pay 0% on loans of $700,000 or less.
// 504: upfront 0.50% and annual 0.203% of the SBA-backed debenture (about 40% of the project); waived for manufacturers/rural/food supply.
function estimateSbaGuarantyFee(loanAmount, guarantyPct, loanType){
  if(loanType === 'sba504'){
    const debenture = loanAmount * 0.40;
    return { kind:'504', guaranteedPortion: debenture, fee: debenture*0.005, feePct: 0.5, annualFee: debenture*0.00203, annualPct: 0.203 };
  }
  const guaranteed = loanAmount * (guarantyPct/100);
  let fee;
  if(loanAmount <= 150000){
    fee = guaranteed * 0.02;
  } else if(loanAmount <= 700000){
    fee = guaranteed * 0.03;
  } else {
    fee = Math.min(guaranteed, 1000000) * 0.035 + Math.max(0, guaranteed - 1000000) * 0.0375;
  }
  return { kind:'7a', guaranteedPortion: guaranteed, fee, feePct: guaranteed > 0 ? Math.round(fee/guaranteed*10000)/100 : 0, annualFee: guaranteed*0.0055, annualPct: 0.55 };
}

// SBA maximum rate over base rate for variable-rate 7(a) loans (sba.gov, 7(a) program terms).
function sba7aMaxSpread(loanAmount){
  if(loanAmount <= 50000) return 6.5;
  if(loanAmount <= 250000) return 6.0;
  if(loanAmount <= 350000) return 4.5;
  return 3.0;
}

// ---------- RENDER: STEP 5 — SBA & COMMERCIAL LOAN ----------
function renderStep5(){
  const rate = state.bizPrimeRate + state.bizSpread;
  const pi = monthlyPI(state.bizLoanAmount, rate, state.bizAmortYears);
  const annualDebtService = pi*12;
  const dscr = state.bizNOI / annualDebtService;

  const isSba = state.bizLoanType === 'sba7a' || state.bizLoanType === 'sba504';
  const guarantyInfo = isSba ? estimateSbaGuarantyFee(state.bizLoanAmount, state.bizGuarantyPct, state.bizLoanType) : null;
  const annualServiceFee = isSba ? guarantyInfo.annualFee : 0;

  // balloon handling — reuse the amortization engine
  let balloonBalance = null;
  if(state.bizBalloonYears > 0 && state.bizBalloonYears < state.bizAmortYears){
    const fullSchedule = buildAmortization(state.bizLoanAmount, rate, state.bizAmortYears);
    const idx = state.bizBalloonYears*12 - 1;
    balloonBalance = fullSchedule[Math.min(idx, fullSchedule.length-1)].balance;
  }

  const maxSpread = sba7aMaxSpread(state.bizLoanAmount);
  const spreadWarn = (state.bizLoanType === 'sba7a' && state.bizSpread > maxSpread)
    ? `<p style="padding:0 2rem 1rem; font-size:0.8rem; color:var(--danger); font-family:'Inter',sans-serif;">SBA caps the spread on variable-rate 7(a) loans of ${fmtMoney(state.bizLoanAmount,0)} at base rate + ${maxSpread}%. A ${state.bizSpread}% spread is above that cap.</p>` : '';
  const dscrColor = dscr >= 1.25 ? 'var(--principal)' : dscr >= 1.0 ? 'var(--gold)' : 'var(--danger)';
  const dscrNote = dscr >= 1.25
    ? 'Meets the typical 1.25x DSCR threshold most SBA and commercial lenders require.'
    : dscr >= 1.0
    ? 'Below the typical 1.25x lender threshold — approval may require additional collateral or a lower loan amount.'
    : 'Below 1.0x — the business is not generating enough net income to cover this debt service as structured.';

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

      ${spreadWarn}
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
        <div class="label">Balloon Payment Due — Year ${state.bizBalloonYears}</div>
        <div class="value">${fmtMoney(balloonBalance,0)}</div>
      </div>` : ''}

      ${isSba ? `
      <div class="breakdown" style="padding-top:0;">
        <div class="line-item"><span>${guarantyInfo.kind === '504' ? 'SBA-Backed Debenture (about 40% of project)' : 'Guaranteed Portion (' + state.bizGuarantyPct + '%)'}</span><span class="num">${fmtMoney(guarantyInfo.guaranteedPortion,0)}</span></div>
        <div class="line-item"><span>Est. Upfront Guaranty Fee (${guarantyInfo.feePct}%)</span><span class="num">${fmtMoney(guarantyInfo.fee,0)}</span></div>
        <div class="line-item"><span>SBA Annual Service Fee (${guarantyInfo.annualPct}%) &middot; paid by the lender, not billed to you</span><span class="num">${fmtMoney(annualServiceFee,0)}</span></div>
      </div>
      <p style="padding:0 2rem 1.5rem; font-size:0.78rem; color:var(--muted); font-family:'Inter',sans-serif;">
        Fees follow SBA's FY 2027 schedules (effective Oct 1, 2026). ${guarantyInfo.kind === '504' ? '504 fees are 0.50% upfront and 0.203% annually on the SBA-backed debenture.' : '7(a) upfront fees are 2% (loans up to $150,000), 3% ($150,001 to $700,000), or 3.5% on the first $1M of the guaranteed portion plus 3.75% above it (over $700,000), applied to the guaranteed portion.'} Manufacturers, food supply chain businesses and rural businesses may pay 0% upfront on loans of $700,000 or less. The lender may pass the upfront fee on to you; confirm the exact figures with your lender.
      </p>
      ` : ''}

      <div class="actions" style="padding-top:0;">
        <a href="#" onclick="event.preventDefault(); state.step=3; render();" style="align-self:center; font-size:0.85rem; color:var(--ink-soft); text-decoration:underline; margin-right:auto;">Looking for a home mortgage instead?</a>
        <button class="btn-primary" id="toBizAmort">View Full Amortization Ledger &rarr;</button>
      </div>
    </div>

    ${adInContent()}

    <div class="panel" style="margin-top:2rem;">
      <div class="article">
        <h2>SBA 7(a) vs. SBA 504 vs. Conventional Commercial Loans</h2>
        <p>The <strong>SBA 7(a) loan</strong> is the SBA's most flexible and widely used program, usable for working capital, equipment, real estate, refinancing debt, or buying a business, with loans up to $5 million and terms up to 25 years for real estate. Rates are typically variable, set as the prime rate plus a lender spread capped by SBA rules.</p>
        <p>The <strong>SBA 504 loan</strong> is structured specifically for major fixed assets — commercial real estate or heavy equipment — and splits financing between a bank (50%), a Certified Development Company backed by the SBA (up to 40%), and the borrower (as little as 10% down). 504 loans typically carry long fixed-rate terms, which can make budgeting more predictable than a variable-rate 7(a) loan.</p>
        <p>A <strong>conventional commercial loan</strong> comes directly from a bank with no SBA guaranty involved. These loans close faster and skip SBA guaranty fees entirely, but usually require stronger financials, a larger down payment, and often carry a shorter amortization with a balloon payment due mid-term — which is why the balloon field in this calculator matters most for conventional deals.</p>

        <h2>Why DSCR Is the Number Lenders Actually Care About</h2>
        <p>Debt Service Coverage Ratio (DSCR) measures whether a business's cash flow can cover its loan payments. It's calculated as annual net operating income divided by annual debt service (principal plus interest). A DSCR of 1.0 means the business generates exactly enough income to cover its debt payments with nothing left over — most SBA and commercial lenders want to see at least <strong>1.25x</strong>, meaning 25% more income than the debt requires, as a cushion against a slow month or unexpected expense.</p>

        <h2>Understanding the SBA Guaranty Fee</h2>
        <p>Unlike a conventional loan, the SBA doesn't lend money directly — it guarantees a portion of the loan a bank makes, which is what allows lenders to approve small businesses they might otherwise consider too risky. In exchange, borrowers pay an upfront guaranty fee calculated as a percentage of the <em>guaranteed</em> portion of the loan (not the full loan amount), on a tiered scale that increases with loan size. There's also an ongoing annual service fee paid by the lender, which is typically built into the loan's overall cost.</p>

        <h2>Frequently Asked Questions</h2>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">Can I use an SBA loan to buy commercial real estate?<span class="mark">+</span></div>
          <div class="faq-a">Yes — both 7(a) and 504 loans can finance owner-occupied commercial real estate, meaning the business itself must occupy at least 51% of an existing building (60% for new construction under 504). Pure investment properties generally don't qualify.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">What happens when a balloon payment comes due?<span class="mark">+</span></div>
          <div class="faq-a">The remaining loan balance becomes due in full. Most borrowers refinance into a new loan at that point rather than paying it off in cash — which is why it's worth reviewing your balance and market rates well before the balloon date arrives.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">Do SBA loan fees and rules change every year?<span class="mark">+</span></div>
          <div class="faq-a">Yes. The SBA publishes updated guaranty fee schedules, loan limits, and program rules annually, and mid-year policy changes do happen. The figures in this calculator reflect currently published guidance, but always confirm exact terms with your SBA lender before finalizing a deal.</div>
        </div>
      </div>
    </div>
  `;
}

// ---------- RENDER: STEP 2 (index 1) — COMMERCIAL AMORTIZATION LEDGER ----------
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
          Year ${yr.year}${isBalloonRow ? ' — Balloon Due' : ''}
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

      ${renderScheduleViewer(buildAmortization(state.bizLoanAmount, rate, state.bizAmortYears), state.bizLoanAmount, rate, 360, 'exportCsvBizAmort', `<table><thead><tr><th>Year</th><th>Principal Paid</th><th>Interest Paid</th><th>Remaining Balance</th></tr></thead><tbody>${tableRows}</tbody></table>`)}
      <div class="actions">
        <button class="btn-ghost" id="backToBiz">&larr; Back</button>
        <button class="btn-primary" id="bizToLoc">Line of Credit Calculator &rarr;</button>
      </div>
    </div>

    ${adInContent()}
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

// ---------- RENDER: STEP 3 (index 2) — LINE OF CREDIT ----------
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
      <td style="${r.draw > 0 ? 'color:var(--principal);' : r.draw < 0 ? 'color:var(--interest);' : ''}">${r.draw !== 0 ? (r.draw>0?'+':'') + fmtMoney(r.draw,0) : '—'}</td>
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

      ${overLimitFlag ? `<p class="over-limit-flag" style="padding:0 2rem;">One or more months exceeds your credit limit — increase the limit or reduce draws.</p>` : ''}

      <div class="breakdown" style="padding-top:1rem;">
        <div class="line-item"><span>Total Drawn</span><span class="num">${fmtMoney(totalDraws,0)}</span></div>
        <div class="line-item"><span>Total Interest Paid Over Period</span><span class="num">${fmtMoney(totalInterest,0)}</span></div>
        <div class="line-item"><span>Available Credit Remaining</span><span class="num">${fmtMoney(availableCredit,0)}</span></div>
      </div>

      <div class="ledger-export">
        <span>Month-by-month schedule</span>
        <button class="btn-utility" id="exportCsvLoc" type="button" title="Download this schedule as a spreadsheet (CSV)">Export CSV</button>
      </div>
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

    ${adInContent()}

    <div class="panel" style="margin-top:2rem;">
      <div class="article">
        <h2>How a Business Line of Credit Works</h2>
        <p>Unlike a term loan, a <strong>line of credit</strong> gives a business access to a revolving pool of funds up to an approved limit. You only pay interest on the portion you've actually drawn — not the full limit — and as you repay, that capacity becomes available to draw again, which is why it's commonly used for working capital, seasonal inventory swings, or covering gaps between receivables.</p>

        <h2>Interest-Only vs. Percent-of-Balance Payments</h2>
        <p>Many revolving lines only require an <strong>interest-only payment</strong> each period, meaning the principal balance doesn't shrink unless you choose to pay it down. Others require a <strong>minimum payment based on a percentage of the outstanding balance</strong> — commonly 1–3% — which gradually reduces principal even if you don't pay extra. This calculator lets you model either structure.</p>

        <h2>Frequently Asked Questions</h2>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">Is a line of credit's interest rate usually fixed or variable?<span class="mark">+</span></div>
          <div class="faq-a">Most business lines of credit carry a variable rate tied to prime, similar to an SBA 7(a) loan — which is why this calculator uses the same prime-plus-spread structure.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">What happens if I go over my credit limit?<span class="mark">+</span></div>
          <div class="faq-a">Most lenders simply won't authorize a draw that exceeds your available limit. Some may allow a temporary over-limit with an additional fee, but this varies by lender and shouldn't be assumed.</div>
        </div>
      </div>
    </div>
  `;
}

// ---------- MARKET NEWS (auto-updating) ----------
const marketNewsState = {
  status: 'idle', // idle | loading | ready | error
  data: null,
  error: null,
  lastFetchedAt: 0,
  refreshTimer: null,
};

const MARKET_NEWS_TTL_MS = 30 * 60 * 1000; // re-fetch at most every 30 minutes in-session

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNewsUpdatedLabel(isoOrDate) {
  try {
    const d = isoOrDate ? new Date(isoOrDate) : new Date();
    if (Number.isNaN(d.getTime())) return 'Updated recently';
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York',
    });
  } catch (_) {
    return 'Updated recently';
  }
}

function marketNewsDataUrlCandidates(force = false) {
  // The cacheable URL must come first on a normal page load: the Pages
  // Function aggregates six upstream feeds and edge-caches the result for
  // 30 minutes, so hitting it with ?fresh=1 on every visit made every
  // visitor pay the full rebuild (20s+ whenever an upstream feed stalls).
  const bust = Date.now();
  const fresh = { url: `/api/market-news?fresh=1&t=${bust}`, cache: 'no-store' };
  const cached = { url: '/api/market-news', cache: 'default' };
  const snapshot = [
    { url: `/data/market-news.json?t=${bust}`, cache: 'no-store' },
    { url: `../data/market-news.json?t=${bust}`, cache: 'no-store' },
  ];
  return force ? [fresh, cached, ...snapshot] : [cached, fresh, ...snapshot];
}

async function fetchMarketNewsPayload(force = false) {
  const tried = new Set();
  let lastErr = null;
  for (const candidate of marketNewsDataUrlCandidates(force)) {
    const { url, cache } = candidate;
    if (tried.has(url)) continue;
    tried.add(url);
    try {
      const res = await fetch(url, { cache });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || (!data.articles && !data.rates)) throw new Error('Invalid payload');
      return data;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Unable to load market news');
}

// Seed every calculator's rate from the live feed once per page load. Skipped for
// shared-link scenarios, and any field the visitor already changed keeps its value.
const RATE_DEFAULTS = { rate: state.rate, affordRate: state.affordRate, newRate: state.newRate, bizPrimeRate: state.bizPrimeRate, locPrimeRate: state.locPrimeRate };
let liveRatesApplied = false;
function applyLiveRates(data) {
  if (liveRatesApplied || sharedStateApplied) return false;
  liveRatesApplied = true;
  const cells = (data && data.rates && data.rates.cells) || [];
  const pct = (re) => { const c = cells.find(c => re.test(c.label || '')); const n = c && parseFloat(c.value); return Number.isFinite(n) ? n : null; };
  const fixed30 = pct(/30.?yr fixed/i);
  const refi = pct(/refinance/i) ?? fixed30;
  const prime = data && data.prime && Number.isFinite(data.prime.value) && data.prime.value > 0 && data.prime.value < 30 ? data.prime.value : null;
  const live = { rate: fixed30, affordRate: fixed30, newRate: refi, bizPrimeRate: prime, locPrimeRate: prime };
  let changed = false;
  for (const k in live) {
    if (live[k] != null && state[k] === RATE_DEFAULTS[k]) { state[k] = live[k]; changed = true; }
  }
  return changed;
}

function ensureMarketNewsLoaded(force = false) {
  const stale = Date.now() - marketNewsState.lastFetchedAt > MARKET_NEWS_TTL_MS;
  if (!force && marketNewsState.data && !stale) return;
  if (marketNewsState.status === 'loading') return;

  marketNewsState.status = 'loading';
  fetchMarketNewsPayload(force)
    .then((data) => {
      marketNewsState.data = data;
      marketNewsState.status = 'ready';
      marketNewsState.error = null;
      marketNewsState.lastFetchedAt = Date.now();
      if (applyLiveRates(data) || state.step === 8) render();
    })
    .catch((err) => {
      marketNewsState.status = marketNewsState.data ? 'ready' : 'error';
      marketNewsState.error = err;
      if (state.step === 8) render();
    });
}

function startMarketNewsAutoRefresh() {
  if (marketNewsState.refreshTimer) return;
  marketNewsState.refreshTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    ensureMarketNewsLoaded(true);
  }, MARKET_NEWS_TTL_MS);
}

function renderRateStrip(rates) {
  if (!rates?.cells?.length) {
    return `
      <div class="rate-strip rate-strip--loading">
        <div class="rate-cell"><div class="label">Rates</div><div class="value">…</div></div>
      </div>
      <p style="padding:1rem 2rem 0; font-size:0.75rem; color:var(--muted); font-family:'Inter',sans-serif;">
        Loading the latest Freddie Mac survey averages…
      </p>`;
  }
  const cells = rates.cells
    .map(
      (c) => `
        <div class="rate-cell">
          <div class="label">${escapeHtml(c.label)}</div>
          <div class="value">${escapeHtml(c.value)}</div>
          ${c.note ? `<div class="rate-note">${escapeHtml(c.note)}</div>` : ''}
        </div>`
    )
    .join('');
  return `
      <div class="rate-strip">${cells}</div>
      <p style="padding:1rem 2rem 0; font-size:0.75rem; color:var(--muted); font-family:'Inter',sans-serif;">
        ${escapeHtml(rates.disclaimer || 'National averages. Individual rates vary. Not a rate quote.')}
        ${rates.asOf ? ` As of ${escapeHtml(rates.asOf)} (${escapeHtml(rates.source || 'PMMS')}).` : ''}
      </p>`;
}

function renderNewsCards(articles) {
  if (!articles?.length) {
    return `
      <div class="news-card">
        <div class="news-meta">Updating</div>
        <h3>Fetching the latest market headlines…</h3>
        <p>Rate averages and news will appear here automatically. If this takes more than a moment, refresh the page.</p>
      </div>`;
  }
  return articles
    .map(
      (a) => `
        <div class="news-card">
          <div class="news-meta">${escapeHtml(a.category || 'News')} &middot; ${escapeHtml(a.source || 'Source')}</div>
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml(a.summary || '')}</p>
          <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">Read the full report &rarr;</a>
        </div>`
    )
    .join('');
}

// ---------- RENDER: STEP 6 — MARKET NEWS & RATES ----------
function renderStep6(){
  ensureMarketNewsLoaded(false);
  startMarketNewsAutoRefresh();

  const data = marketNewsState.data;
  const updatedLabel = formatNewsUpdatedLabel(data?.updatedAt || data?.rates?.asOf);
  const statusHint =
    marketNewsState.status === 'loading' && !data
      ? 'Loading live rates…'
      : marketNewsState.status === 'error' && !data
        ? 'Live feed unavailable — try again shortly.'
        : `Updated ${updatedLabel}`;

  return `
    <div class="eyebrow">Step 09 &middot; ${escapeHtml(statusHint)}</div>
    <h1>Market News &amp; Rates</h1>
    <p class="sub">A live snapshot of national mortgage averages and recent developments in home lending and small business financing. This section refreshes automatically.</p>

    <div class="panel">
      ${renderRateStrip(data?.rates)}

      ${adInContent()}

      <div id="marketNewsList">
        ${renderNewsCards(data?.articles)}
      </div>

      ${adInArticle('tools-news-mid')}
    </div>
  `;
}

function renderFooter(){
  return `
    <div class="site-footer">
      <div class="footer-cols">
        <div class="footer-col">
          <h4>LoansFlow</h4>
          <p>Free SBA, commercial, and mortgage calculators. Estimates only — not a lender or loan offer.</p>
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
    body: `<p>LoansFlow is a free calculator suite for small business and home financing.</p>
           <p>Core tools cover SBA 7(a), SBA 504, and conventional commercial loans — DSCR, guaranty fees, balloons, and amortization — plus mortgage payment, refinance, and affordability calculators.</p>
           <p>Everything runs in your browser. We do not collect loan applications, sell leads, or require an account.</p>`
  },
  contact: {
    title: "Contact",
    body: `<p>Questions, corrections, or feedback about a calculation? Reach out any time.</p>
           <p><strong>Contact:</strong> <a href="../contact.html">send us a message</a></p>`
  },
  privacy: {
    title: "Privacy Policy",
    body: `<p>This site does not require an account and does not collect the loan information you enter into any calculator — all calculations run locally in your browser and are never transmitted to our servers.</p>
           <p>Like most websites, we use cookies and similar technologies for basic site functionality and to serve advertising. We work with third-party advertising partners, including Google, who may use cookies to serve ads based on your prior visits to this and other websites. You can learn more about how Google uses this data and manage your ad preferences at Google's Ads Settings.</p>
           <p>We do not knowingly collect personal information from children under 13. This policy may be updated periodically; continued use of the site constitutes acceptance of the current policy.</p>`
  },
  disclaimer: {
    title: "Disclaimer",
    body: `<p>The calculators on this site provide estimates for general educational and informational purposes only. They are not a loan offer, pre-approval, or guarantee of terms, and do not constitute financial, legal, or tax advice.</p>
           <p>Actual loan terms — including interest rate, fees, insurance, taxes, and eligibility — are determined by individual lenders based on your full financial profile and are subject to change. SBA program rules, fees, and loan limits are set by the U.S. Small Business Administration and may change without notice; always confirm current figures directly with an SBA-approved lender.</p>
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

// ---------- INTAKE WIZARD: "what are you financing?" ----------
// A lightweight gate in front of the calculator steps. Skipped entirely
// when the visitor arrives with an explicit ?step= link or a shared/pinned
// scenario (state.introDone is set true at boot in that case) — the intake
// is only for a cold arrival that hasn't told us what it wants yet.
function introChoice(num, title, note, attrs){
  return `
    <button class="intro-choice" type="button" ${attrs}>
      <span class="intro-choice-num">${num}</span>
      <span class="intro-choice-body">
        <strong>${title}</strong>
        <small>${note}</small>
      </span>
    </button>`;
}
// SBA program facts shown in the business intake. General program rules —
// lenders layer their own credit requirements on top. Verify at sba.gov.
function renderSbaCompare(){
  const row = (label, a, b) => `<tr><th scope="row">${label}</th><td>${a}</td><td>${b}</td></tr>`;
  return `
    <details class="sba-compare" open>
      <summary>SBA 7(a) vs. SBA 504 — what's the difference?</summary>
      <div class="sba-compare-wrap">
        <table class="sba-compare-table">
          <thead><tr><th></th><th scope="col">SBA 7(a)</th><th scope="col">SBA 504</th></tr></thead>
          <tbody>
            ${row('Best for', 'Working capital, inventory, equipment, buying a business, refinancing debt, real estate', 'Owner-occupied commercial real estate and long-life equipment only')}
            ${row('Max loan', 'Up to $5 million', 'CDC portion up to $5M ($5.5M manufacturing/energy); total project can be larger')}
            ${row('Typical down payment', '10%–20%', '10% (15%–20% for startups or special-purpose buildings)')}
            ${row('Loan length', 'Up to 10 yrs (working capital/equipment), 25 yrs (real estate)', '10, 20, or 25 years')}
            ${row('Rate', 'Usually variable: prime + a capped lender spread', 'Fixed rate on the CDC portion; bank portion set by the lender')}
            ${row('Structure', 'One lender; SBA guarantees 75%–85%', 'Bank ~50% + CDC/SBA ~40% + you ~10%')}
            ${row('Extra requirements', '—', 'Must occupy 51%+ of the property; job creation or public-policy goal')}
          </tbody>
        </table>
      </div>
      <div class="sba-qualify">
        <strong>What lenders look for (both programs)</strong>
        <ul>
          <li>For-profit U.S. business that meets SBA size standards</li>
          <li>Cash flow that covers the payment — typically a DSCR of 1.15x–1.25x or better</li>
          <li>Owner credit usually 650–680+ (lender-dependent); no federal debt defaults</li>
          <li>Owners with 20%+ ownership personally guarantee the loan</li>
          <li>Owner equity invested, and financing not reasonably available elsewhere</li>
        </ul>
        <small>General program guidelines — confirm current limits at <a href="https://www.sba.gov/funding-programs/loans" target="_blank" rel="noopener">sba.gov</a> and with your lender.</small>
      </div>
    </details>`;
}
function introNumField(id, label, value, prefix, suffix){
  return `
    <label class="intro-field"><span>${label}</span>
      <span class="intro-input">${prefix ? `<em>${prefix}</em>` : ''}<input type="number" inputmode="decimal" id="${id}" value="${value}" min="0" step="any" required>${suffix ? `<em>${suffix}</em>` : ''}</span>
    </label>`;
}
function introSelect(id, label, options, current){
  return `
    <label class="intro-field"><span>${label}</span>
      <select id="${id}">${options.map(o => `<option value="${o}" ${Number(o) === Number(current) ? 'selected' : ''}>${o} years</option>`).join('')}</select>
    </label>`;
}
function introIncomeField(annual){
  return `
    <div class="intro-field intro-field--wide"><span>Your income</span>
      <div class="intro-income">
        <span class="intro-input"><em>$</em><input type="number" inputmode="decimal" id="introIncome" value="${Math.round(annual)}" min="0" step="any" required></span>
        <select id="introIncomePeriod" aria-label="Income period"><option value="annual">per year</option><option value="monthly">per month</option></select>
      </div>
      <small>Gross (before tax) household income. Choose per month if that's easier.</small>
    </div>`;
}
// ---------- "Not sure which SBA loan" helper ----------
// Rough side-by-side of 7(a) vs 504 for the same project. The 504 CDC rate and
// bank spread are planning assumptions (labelled on screen), not quotes.
const SBA504_CDC_RATE_EST = 6.25;   // ponytail: fixed assumption; wire to a live CDC debenture rate if one becomes available
const SBA504_BANK_SPREAD = 1.5;
let sbaAnswers = null;

function introChoiceSelect(id, label, options){
  return `
    <label class="intro-field"><span>${label}</span>
      <select id="${id}">${options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
    </label>`;
}
function renderSbaQuestions(){
  const a = sbaAnswers || {};
  const sel = (id, label, opts) => introChoiceSelect(id, label, opts).replace(`value="${a[id]}"`, `value="${a[id]}" selected`);
  return `
    <div class="eyebrow">Quick start &middot; SBA helper &middot; Step 3 of 4</div>
    <h1>Let's find your best SBA fit</h1>
    <p class="sub">Answer honestly — rough numbers are fine. We'll calculate both loans and show which one you're more likely to qualify for.</p>
    <form class="intro-details" id="sbaQuestions" novalidate>
      <div class="intro-fields">
        ${sel('use', 'What is the money for?', [['realestate', 'Buy or build property for my business'], ['equipment', 'Heavy equipment or machinery'], ['working', 'Working capital or inventory'], ['acquisition', 'Buy an existing business'], ['refi', 'Refinance existing business debt']])}
        ${sel('occupy', 'If property: will your business use 51%+ of it?', [['na', 'Not buying property'], ['yes', 'Yes'], ['no', 'No — mostly leased to others']])}
        ${introNumField('project', 'Total project cost (price + improvements)', a.project || 750000, '$')}
        ${introNumField('noi', 'Business net income per year (before loan payments)', a.noi || state.bizNOI, '$')}
        ${sel('age', 'How long in business?', [['2plus', '2 years or more'], ['startup', 'Less than 2 years / startup']])}
        ${sel('credit', 'Owner credit score (roughly)', [['680', '680 or higher'], ['650', '650–679'], ['low', 'Below 650'], ['unknown', "Not sure"]])}
        ${introSelect('years', 'Loan length you want', [10, 20, 25], a.years || 25)}
      </div>
      <button class="btn-primary" type="submit">Compare both loans &rarr;</button>
    </form>
    <p class="intro-back"><a href="#" id="introBack">&larr; Back</a></p>`;
}
function readSbaQuestions(){
  const v = (id) => document.getElementById(id).value;
  const n = (id) => { const x = parseFloat(v(id)); return Number.isFinite(x) && x > 0 ? x : 0; };
  sbaAnswers = { use: v('use'), occupy: v('occupy'), project: n('project'), noi: n('noi'), age: v('age'), credit: v('credit'), years: n('years') || 25 };
}
function sbaScenarios(a){
  const prime = state.bizPrimeRate;
  const property = a.use === 'realestate';
  const fixedAsset = property || a.use === 'equipment';
  const startup = a.age === 'startup';
  // 7(a): one loan for ~90% of the project; max 25 yrs for real estate, 10 otherwise; $5M cap.
  const down7a = a.project * (startup ? 0.2 : 0.1);
  const loan7a = Math.min(5000000, a.project - down7a);
  const years7a = Math.min(a.years, property ? 25 : 10);
  const rate7a = prime + (loan7a > 350000 ? 3 : 4.5);
  const pmt7a = monthlyPI(loan7a, rate7a, years7a);
  const fee7a = estimateSbaGuarantyFee(loan7a, loan7a <= 150000 ? 85 : 75).fee;
  // 504: bank 50% + CDC 40% (35% if 15% down) + borrower 10% (15% for startups / special-purpose).
  const downPct504 = startup ? 0.15 : 0.1;
  const bank = a.project * 0.5;
  const cdc = Math.min(5000000, a.project * (0.5 - downPct504));
  const down504 = a.project - bank - cdc;
  const years504 = [10, 20, 25].includes(a.years) ? a.years : 25;
  const bankRate = prime + SBA504_BANK_SPREAD;
  const pmt504 = monthlyPI(bank, bankRate, years504) + monthlyPI(cdc, SBA504_CDC_RATE_EST, years504);
  const fee504 = cdc * 0.0215;  // ponytail: approx. CDC/SBA upfront fees; lender quotes the exact figure
  const creditNote = a.credit === 'low' ? 'Credit below 650 is a hurdle for most SBA lenders' : a.credit === 'unknown' ? 'Check your credit — lenders typically want 650–680+' : null;
  const dscr = (pmt) => a.noi / (pmt * 12);
  const checks = (eligible, reasons) => ({ eligible, reasons });
  const r7a = [];
  if (a.use === 'refi') r7a.push(['ok', 'Refinancing business debt is allowed']);
  if (startup) r7a.push(['warn', 'Startups usually need 20%+ down and strong experience']);
  const r504 = [];
  if (!fixedAsset) r504.push(['no', '504 only funds real estate or long-life equipment']);
  if (property && a.occupy === 'no') r504.push(['no', 'Your business must occupy at least 51% of the property']);
  if (fixedAsset && !(property && a.occupy === 'no')) r504.push(['ok', 'Eligible use: fixed assets']);
  r504.push(['warn', 'Needs job creation/retention or a public-policy goal (most businesses meet this)']);
  [r7a, r504].forEach(list => { if (creditNote) list.push(['warn', creditNote]); });
  return {
    sba7a: { loan: loan7a, down: down7a, years: years7a, rate: rate7a, payment: pmt7a, fee: fee7a, dscr: dscr(pmt7a), ...checks(true, r7a) },
    sba504: { loan: bank + cdc, bank, cdc, down: down504, years: years504, rate: null, bankRate, payment: pmt504, fee: fee504, dscr: dscr(pmt504), ...checks(fixedAsset && !(property && a.occupy === 'no'), r504) }
  };
}
function renderSbaResult(){
  const a = sbaAnswers;
  const sc = sbaScenarios(a);
  const dscrTag = (d) => d >= 1.25 ? ['ok', 'Strong'] : d >= 1.15 ? ['warn', 'Borderline'] : ['no', 'Too low — most lenders want 1.15x–1.25x'];
  const best = sc.sba504.eligible && sc.sba504.payment < sc.sba7a.payment ? 'sba504' : 'sba7a';
  const card = (key, title, rows, s) => {
    const [dt, dl] = dscrTag(s.dscr);
    return `
      <div class="sba-card ${key === best ? 'sba-card--best' : ''} ${s.eligible ? '' : 'sba-card--no'}">
        <div class="sba-card-head"><strong>${title}</strong>${key === best ? '<span class="compare-best-tag">Likely best fit</span>' : ''}${s.eligible ? '' : '<span class="sba-tag-no">Probably not eligible</span>'}</div>
        <div class="sba-card-pay"><span>Est. monthly payment</span><strong>${fmtMoney(s.payment, 0)}</strong></div>
        <dl class="sba-card-rows">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
          <div><dt>Cash-flow coverage (DSCR)</dt><dd class="sba-${dt}">${s.dscr.toFixed(2)}x · ${dl}</dd></div></dl>
        <ul class="sba-checks">${s.reasons.map(([t, msg]) => `<li class="sba-${t}">${msg}</li>`).join('')}</ul>
        ${s.eligible ? `<button class="btn-utility btn-utility--accent" type="button" data-open-sba="${key}">Open ${title} in calculator &rarr;</button>` : ''}
      </div>`;
  };
  return `
    <div class="eyebrow">Quick start &middot; SBA helper &middot; Step 4 of 4</div>
    <h1>Your two SBA options</h1>
    <p class="sub">For a ${fmtMoney(a.project, 0)} project with ${fmtMoney(a.noi, 0)}/yr net income. Estimates only — a lender makes the final call.</p>
    <div class="sba-cards">
      ${card('sba7a', 'SBA 7(a)', [
        ['Your down payment', fmtMoney(sc.sba7a.down, 0)],
        ['Loan amount', fmtMoney(sc.sba7a.loan, 0)],
        ['Rate', sc.sba7a.rate.toFixed(2) + '% variable (prime ' + state.bizPrimeRate.toFixed(2) + '% + spread)'],
        ['Loan length', sc.sba7a.years + ' years'],
        ['Est. SBA guaranty fee', fmtMoney(sc.sba7a.fee, 0)]
      ], sc.sba7a)}
      ${card('sba504', 'SBA 504', [
        ['Your down payment', fmtMoney(sc.sba504.down, 0)],
        ['Bank loan (50%)', fmtMoney(sc.sba504.bank, 0) + ' at ' + sc.sba504.bankRate.toFixed(2) + '%'],
        ['CDC/SBA loan', fmtMoney(sc.sba504.cdc, 0) + ' at ~' + SBA504_CDC_RATE_EST.toFixed(2) + '% fixed*'],
        ['Loan length', sc.sba504.years + ' years'],
        ['Est. upfront fees', fmtMoney(sc.sba504.fee, 0)]
      ], sc.sba504)}
    </div>
    <p class="sba-footnote">*504 CDC rate is an estimate — it's set monthly from Treasury yields; ask a CDC for the current rate. 7(a) spread assumes SBA's maximum (prime + 3% over $350K). Real rates, fees, and approval depend on the lender.</p>
    <p class="intro-back"><a href="#" id="introBack">&larr; Change my answers</a></p>`;
}

function renderIntroDetails(){
  const p = introPick;
  let title, fields;
  if (p.step === 2) {
    title = 'Tell us about the line of credit';
    fields = introNumField('introLocLimit', 'Credit limit you want', state.locLimit, '$') +
      introNumField('introLocMonths', 'Months to project', state.locMonths, '', 'months');
  } else if (p.audience === 'business') {
    title = p.step === 1 ? 'Tell us about your loan' : 'Tell us about the loan you need';
    const lengths = p.bizType === 'sba504' ? [10, 20, 25] : [5, 7, 10, 15, 20, 25];
    fields = introNumField('introBizAmount', 'How much do you want to borrow?', state.bizLoanAmount, '$') +
      introSelect('introBizYears', 'Loan length', lengths, lengths.includes(state.bizAmortYears) ? state.bizAmortYears : 10) +
      introNumField('introBizNOI', 'Business net income per year (before loan payments)', state.bizNOI, '$');
  } else {
    title = p.step === 6 ? 'Tell us about your current home loan' : 'Tell us about the home';
    fields = introNumField('introHomePrice', p.step === 6 ? 'Home value' : 'Home price', state.homePrice, '$') +
      introNumField('introDown', p.step === 6 ? 'Equity (value minus what you owe)' : 'Down payment', state.downPayment, '$') +
      introSelect('introTerm', 'Loan length', [10, 15, 20, 30], state.term) +
      introIncomeField(state.income) +
      introNumField('introDebts', 'Monthly debt payments (car, student loans, cards)', state.monthlyDebts, '$');
  }
  return `
    <div class="eyebrow">Quick start &middot; Step 3 of 3</div>
    <h1>${title}</h1>
    <p class="sub">Rough numbers are fine — you can fine-tune everything in the calculator. Rates are pre-filled with today's averages.</p>
    <form class="intro-details" id="introDetails" novalidate>
      <div class="intro-fields">${fields}</div>
      <button class="btn-primary" type="submit">Show my numbers &rarr;</button>
    </form>
    <p class="intro-back"><a href="#" id="introBack">&larr; Back</a></p>`;
}
function applyIntroDetails(){
  const num = (id) => { const el = document.getElementById(id); const v = el ? parseFloat(el.value) : NaN; return Number.isFinite(v) && v >= 0 ? v : null; };
  const set = (key, v) => { if (v !== null) state[key] = v; };
  set('locLimit', num('introLocLimit'));
  const months = num('introLocMonths'); if (months) state.locMonths = Math.min(120, Math.max(1, Math.round(months)));
  set('bizLoanAmount', num('introBizAmount'));
  set('bizAmortYears', num('introBizYears'));
  set('bizNOI', num('introBizNOI'));
  set('homePrice', num('introHomePrice'));
  set('downPayment', num('introDown'));
  const term = num('introTerm'); if (term) { state.term = term; state.newTerm = term; }
  const income = num('introIncome');
  if (income !== null) {
    const period = document.getElementById('introIncomePeriod');
    state.income = period && period.value === 'monthly' ? income * 12 : income;
  }
  set('monthlyDebts', num('introDebts'));
  const down = num('introDown'); if (down !== null) state.affordDownPayment = down;
}

function renderIntro(){
  if (introStage === 'business') {
    return `
      <div class="eyebrow">Quick start &middot; Business &middot; Step 2 of 3</div>
      <h1>Which kind of financing?</h1>
      <p class="sub">Not sure? Compare the two SBA programs below, then pick the closest match. You can switch tools anytime from the sidebar.</p>
      ${renderSbaCompare()}
      <div class="intro-choices">
        ${introChoice('?', "Not sure which SBA loan I'd qualify for", 'Answer a few questions and we\'ll calculate both 7(a) and 504 side by side', 'data-step="0" data-biz-type="compare"')}
        ${introChoice('1', 'SBA 7(a) loan', 'General-purpose financing with a government guaranty', 'data-step="0" data-biz-type="sba7a"')}
        ${introChoice('2', 'SBA 504 loan', 'Fixed-asset financing — real estate or heavy equipment', 'data-step="0" data-biz-type="sba504"')}
        ${introChoice('3', 'Conventional commercial loan', 'Bank-direct financing, no SBA guaranty', 'data-step="0" data-biz-type="conventional"')}
        ${introChoice('4', 'Line of credit', 'Revolving credit for working capital', 'data-step="2"')}
        ${introChoice('5', 'A loan I already have', 'See the amortization and payoff schedule', 'data-step="1"')}
      </div>
      <p class="intro-back"><a href="#" id="introBack">&larr; Back</a></p>`;
  }
  if (introStage === 'mortgage') {
    return `
      <div class="eyebrow">Quick start &middot; Home &middot; Step 2 of 3</div>
      <h1>What do you need to know?</h1>
      <p class="sub">Pick the closest match — you can switch tools anytime from the sidebar.</p>
      <div class="intro-choices">
        ${introChoice('1', 'Monthly payment', 'Principal, interest, taxes &amp; insurance', 'data-step="3"')}
        ${introChoice('2', 'Full amortization schedule', 'Month-by-month payoff ledger', 'data-step="5"')}
        ${introChoice('3', 'Should I refinance?', 'Compare your current loan to a new rate', 'data-step="6"')}
        ${introChoice('4', 'What can I afford?', 'Based on income and monthly debts', 'data-step="7"')}
        ${introChoice('5', "Today's rates", 'Live national mortgage averages', 'data-step="8" data-direct="1"')}
      </div>
      <p class="intro-back"><a href="#" id="introBack">&larr; Back</a></p>`;
  }
  if (introStage === 'sbaResult' && sbaAnswers) return renderSbaResult();
  if (introStage === 'details' && introPick && introPick.bizType === 'compare') return renderSbaQuestions();
  if (introStage === 'details' && introPick) return renderIntroDetails();
  return `
    <div class="eyebrow">Quick start &middot; Step 1 of 3</div>
    <h1>What are you financing?</h1>
    <p class="sub">Three quick steps: what it's for, which loan, and your numbers. We'll open the right calculator with everything filled in.</p>
    <div class="intro-choices">
      ${introChoice('A', 'A business', 'SBA 7(a), SBA 504, conventional commercial, or a line of credit', 'data-audience="business"')}
      ${introChoice('B', 'A home', "Purchase, refinance, affordability, or today's mortgage rates", 'data-audience="mortgage"')}
    </div>
    <p class="intro-skip"><a href="#" id="introSkip">Skip &mdash; I know which calculator I want &rarr;</a></p>`;
}
function attachIntroHandlers(){
  document.querySelectorAll('.intro-choice[data-audience]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ introStage = btn.dataset.audience; render(); });
  });
  document.querySelectorAll('.intro-choice[data-step]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if (btn.dataset.bizType && btn.dataset.bizType !== 'compare') state.bizLoanType = btn.dataset.bizType;
      const step = parseInt(btn.dataset.step, 10);
      if (btn.dataset.direct) { state.step = step; state.introDone = true; render(); return; }
      introPick = { step, bizType: btn.dataset.bizType, audience: introStage };
      introStage = 'details';
      render();
    });
  });
  const sbaQ = document.getElementById('sbaQuestions');
  if (sbaQ) sbaQ.addEventListener('submit', (e)=>{ e.preventDefault(); readSbaQuestions(); introStage = 'sbaResult'; render(); });
  document.querySelectorAll('[data-open-sba]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const sc = sbaScenarios(sbaAnswers)[btn.dataset.openSba];
      state.bizLoanType = btn.dataset.openSba;
      state.bizLoanAmount = Math.round(sc.loan);
      state.bizAmortYears = sc.years;
      state.bizNOI = sbaAnswers.noi;
      // The calculator models one loan, so carry the 504 bank + CDC split over as
      // the single blended rate that produces the same monthly payment.
      if (btn.dataset.openSba === 'sba504') {
        let lo = 0, hi = 30;
        for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (monthlyPI(sc.loan, mid, sc.years) < sc.payment) lo = mid; else hi = mid; }
        state.bizSpread = Math.round(((lo + hi) / 2 - state.bizPrimeRate) * 1000) / 1000;
      }
      state.step = 0;
      state.introDone = true;
      render();
    });
  });
  const details = document.getElementById('introDetails');
  if (details) details.addEventListener('submit', (e)=>{
    e.preventDefault();
    applyIntroDetails();
    state.step = introPick.step;
    state.introDone = true;
    render();
  });
  const skip = document.getElementById('introSkip');
  if (skip) skip.addEventListener('click', (e)=>{ e.preventDefault(); state.introDone = true; render(); });
  const back = document.getElementById('introBack');
  if (back) back.addEventListener('click', (e)=>{
    e.preventDefault();
    introStage = introStage === 'sbaResult' ? 'details' : introStage === 'details' && introPick ? introPick.audience : 'start';
    render();
  });
}

function render(){
  renderNav();
  const main = document.getElementById('mainContent');
  if (!state.introDone) {
    main.innerHTML = renderIntro();
    attachIntroHandlers();
    main.scrollTop = 0;
    window.scrollTo(0,0);
    return;
  }
  const renderers = [renderStep5, renderStepBizAmort, renderStepLOC, renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep6];
  main.innerHTML = renderWorkflowBar() + renderers[state.step]() + renderFooter();
  attachHandlers();
  wireChartInteractions();
  wireScheduleViewer();
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
  const restartWizard = document.getElementById('restartWizard');
  if (restartWizard) restartWizard.addEventListener('click', () => {
    introStage = 'start';
    state.introDone = false;
    render();
  });

  const shareScenario = document.getElementById('shareScenario');
  if (shareScenario) shareScenario.addEventListener('click', copyShareLink);

  const printReport = document.getElementById('printReport');
  if (printReport) printReport.addEventListener('click', () => {
    openReportOptions();
  });

  const compareScenarios = document.getElementById('compareScenarios');
  if (compareScenarios) compareScenarios.addEventListener('click', openCompareModal);
  const pinScenario = document.getElementById('pinScenario');
  if (pinScenario) pinScenario.addEventListener('click', () => {
    pinCurrentScenario();
    render();
    const n = pinnedScenarios.length;
    const status = document.getElementById('workflowStatus');
    if (status) status.textContent = n === 1
      ? 'Pinned. Now change a number and pin again to compare.'
      : 'Pinned #' + n + ' — click "Compare pinned" to see them side by side.';
  });

  const csvBiz = document.getElementById('exportCsvBizAmort');
  if (csvBiz) csvBiz.addEventListener('click', exportBizAmortCsv);
  const csvMort = document.getElementById('exportCsvAmort');
  if (csvMort) csvMort.addEventListener('click', exportMortgageAmortCsv);
  const csvLoc = document.getElementById('exportCsvLoc');
  if (csvLoc) csvLoc.addEventListener('click', exportLocCsv);

  document.querySelectorAll('[data-chart-mode]').forEach(button => {
    button.addEventListener('click', () => {
      state.amortChartMode = button.dataset.chartMode;
      render();
    });
  });

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
    readInputs(['newRate','refiYearsPaid','refiClosingCosts']);
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

  // line of credit — field changes
  ['locLimit','locMonths','locPrimeRate','locSpread','locPaymentType','locMinPercent'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', ()=>{
      readInputs(['locLimit','locMonths','locPrimeRate','locSpread','locMinPercent']);
      const typeEl = document.getElementById('locPaymentType');
      if(typeEl) state.locPaymentType = typeEl.value;
      render();
    });
  });

  // line of credit — draw row month/amount changes
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

  // line of credit — remove a draw row
  document.querySelectorAll('.btn-remove').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = parseInt(el.dataset.removeId);
      state.locDraws = state.locDraws.filter(d=>d.id!==id);
      render();
    });
  });

  // line of credit — add a draw row
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
  ['newRate','newTerm','refiYearsPaid','refiClosingCosts'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', ()=>{
      readInputs(['newRate','refiYearsPaid','refiClosingCosts']);
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

const sharedStateApplied = loadSharedState();
if (typeof window.__LF_INITIAL_STEP === 'number' && window.__LF_INITIAL_STEP >= 0 && window.__LF_INITIAL_STEP <= 8) {
  state.step = window.__LF_INITIAL_STEP;
  state.introDone = true;
} else if (sharedStateApplied) {
  // A shared/pinned scenario link already tells us exactly what the visitor
  // wants -- don't make them re-answer the intake questions.
  state.introDone = true;
}
const restartWizardBtn = document.getElementById('restartWizard');
if (restartWizardBtn) restartWizardBtn.addEventListener('click', () => {
  introStage = 'start';
  state.introDone = false;
  render();
});

// Warm the news cache so Step 09 is current when opened
ensureMarketNewsLoaded(false);
startMarketNewsAutoRefresh();
render();




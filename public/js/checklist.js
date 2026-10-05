/*
  LoansFlow — Loan Document Checklist logic
  Renders an interactive checklist, tracks progress, persists to localStorage,
  and generates a downloadable text file. No dependencies.
*/
const CHECKLIST_STORAGE_KEY = "lf-checklist-v1";

/* ------------------------------------------------------------------ */
/* Data: groups and items. Each item has a unique id, a label, and an */
/* optional hint. Change this array to update the checklist everywhere. */
/* ------------------------------------------------------------------ */
const CHECKLIST_DATA = [
  {
    group: "A. Identity & business formation",
    items: [
      { id: "a1", label: "Government-issued photo ID", hint: "Driver's license, passport, or state ID for each owner." },
      { id: "a2", label: "Social Security numbers of owners with 20%+", hint: "Every owner holding 20 percent or more of the business." },
      { id: "a3", label: "EIN confirmation letter (CP 575 or 147C)", hint: "IRS letter verifying the employer identification number." },
      { id: "a4", label: "Articles of incorporation or organization", hint: "Filed with your state." },
      { id: "a5", label: "Bylaws or operating agreement", hint: "Corporate governance document." },
      { id: "a6", label: "Business licenses and permits", hint: "State, county, and city-level licenses for your industry." },
      { id: "a7", label: "DBA registration", hint: "Required if operating under a fictitious name." },
      { id: "a8", label: "Franchise agreement (if applicable)", hint: "Include the full executed agreement." }
    ]
  },
  {
    group: "B. SBA forms",
    items: [
      { id: "b1", label: "SBA Form 1919 — Borrower Information Form", hint: "Primary application form." },
      { id: "b2", label: "SBA Form 912 — Statement of Personal History", hint: "For every owner with 20 percent or more." },
      { id: "b3", label: "SBA Form 413 — Personal Financial Statement", hint: "For every owner with 20 percent or more." },
      { id: "b4", label: "SBA Form 159 — Fee Disclosure and Compensation Agreement", hint: "Required only if a broker or consultant is paid." }
    ]
  },
  {
    group: "C. Tax and financial statements",
    items: [
      { id: "c1", label: "Three years of business federal tax returns", hint: "All schedules, including 1120, K-1, or Schedule C as applicable." },
      { id: "c2", label: "Three years of personal federal tax returns (owners 20%+)", hint: "All schedules for each qualifying owner." },
      { id: "c3", label: "Year-to-date profit and loss (within 90 days)", hint: "Interim P&L statement." },
      { id: "c4", label: "Current balance sheet", hint: "As of the most recent month-end." },
      { id: "c5", label: "Twelve months of business bank statements", hint: "All business deposit accounts." },
      { id: "c6", label: "Debt schedule", hint: "List every existing loan, line, and lease with balances, rates, maturities." },
      { id: "c7", label: "Accounts receivable aging report", hint: "Shows outstanding invoices by age bucket." },
      { id: "c8", label: "Accounts payable aging report", hint: "Shows outstanding payables by age bucket." }
    ]
  },
  {
    group: "D. Business profile",
    items: [
      { id: "d1", label: "Business overview and history", hint: "One to three pages: what you do, major customers, operational status." },
      { id: "d2", label: "Resumes of principals", hint: "One page each, emphasizing management and industry background." },
      { id: "d3", label: "Business plan", hint: "Required for startups and SBA 504 loans." },
      { id: "d4", label: "Cash-flow projection", hint: "Required for startups or if cash flow is inconsistent." }
    ]
  },
  {
    group: "E. Collateral and project",
    items: [
      { id: "e1", label: "Purchase agreement", hint: "Contract for asset or property being acquired." },
      { id: "e2", label: "Equipment quotes or invoices", hint: "From vendors; include model numbers and useful life." },
      { id: "e3", label: "Real estate appraisal", hint: "Lender orders this; you provide access." },
      { id: "e4", label: "Phase I environmental report", hint: "Required for SBA 504 real estate projects." },
      { id: "e5", label: "Existing mortgage or loan statements", hint: "For any debt being refinanced." },
      { id: "e6", label: "Property photos or rent roll", hint: "For income-producing real estate." }
    ]
  },
  {
    group: "F. Mortgage extras",
    items: [
      { id: "f1", label: "Thirty days of recent pay stubs", hint: "From every wage-earning borrower." },
      { id: "f2", label: "Two years of W-2 forms", hint: "From every wage-earning borrower." },
      { id: "f3", label: "Two months of personal bank statements", hint: "All personal deposit accounts." },
      { id: "f4", label: "Gift letter", hint: "Required if the down payment comes from a donor; must state no repayment is expected." },
      { id: "f5", label: "Divorce or child-support documents", hint: "Include decree and payment history if relevant to DTI." }
    ]
  },
  {
    group: "G. Before you submit",
    items: [
      { id: "g1", label: "Run the payment and DSCR numbers", hint: "Use the SBA and commercial calculators at /tools/." },
      { id: "g2", label: "Verify broker licensing", hint: "Check NMLS at nmlsconsumeraccess.org." },
      { id: "g3", label: "Confirm no upfront fees", hint: "Reputable lenders do not collect fees before a commitment." },
      { id: "g4", label: "Read the fee disclosure (Form 159)", hint: "Understand what you are paying and to whom." },
      { id: "g5", label: "Keep a copy of everything", hint: "Save PDFs of every page you submit." }
    ]
  }
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function loadState() {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state) {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — fail silently */
  }
}

function countAllItems() {
  return CHECKLIST_DATA.reduce((sum, g) => sum + g.items.length, 0);
}

function countChecked(state) {
  return CHECKLIST_DATA.reduce((sum, g) => {
    return sum + g.items.filter(it => state[it.id]).length;
  }, 0);
}

/* ------------------------------------------------------------------ */
/* Render                                                             */
/* ------------------------------------------------------------------ */
function renderChecklist() {
  const container = document.getElementById("lfChecklist");
  if (!container) return;
  const state = loadState();

  container.innerHTML = "";

  CHECKLIST_DATA.forEach(group => {
    const section = document.createElement("div");
    section.className = "check-group";

    const heading = document.createElement("h3");
    heading.textContent = group.group;
    section.appendChild(heading);

    group.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "check-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = item.id;
      cb.checked = !!state[item.id];

      const label = document.createElement("label");
      label.htmlFor = item.id;
      label.textContent = item.label;

      if (item.hint) {
        const hint = document.createElement("span");
        hint.className = "hint";
        hint.textContent = item.hint;
        row.appendChild(cb);
        row.appendChild(label);
        row.appendChild(hint);
      } else {
        row.appendChild(cb);
        row.appendChild(label);
      }

      cb.addEventListener("change", () => {
        const s = loadState();
        if (cb.checked) {
          s[item.id] = true;
        } else {
          delete s[item.id];
        }
        saveState(s);
        updateProgress();
      });

      section.appendChild(row);
    });

    container.appendChild(section);
  });

  updateProgress();
}

/* ------------------------------------------------------------------ */
/* Progress                                                           */
/* ------------------------------------------------------------------ */
function updateProgress() {
  const state = loadState();
  const total = countAllItems();
  const checked = countChecked(state);
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100);

  const fill = document.getElementById("lfProgressFill");
  if (fill) fill.style.width = pct + "%";

  const counts = document.getElementById("lfCounts");
  if (counts) counts.textContent = checked + " of " + total + " items";
}

/* ------------------------------------------------------------------ */
/* Download text file                                                 */
/* ------------------------------------------------------------------ */
function buildChecklistText() {
  const state = loadState();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  let businessName = "";
  try {
    businessName = prompt("Enter your business name (optional):", "") || "";
  } catch {
    businessName = "";
  }

  const lines = [];
  lines.push("LoansFlow — Loan Document Checklist");
  lines.push("Generated: " + dateStr);
  if (businessName) lines.push("Business: " + businessName);
  lines.push("URL: https://loansflow.loan/guides/checklist.html");
  lines.push("");

  CHECKLIST_DATA.forEach(group => {
    lines.push(group.group);
    lines.push("-".repeat(group.group.length));
    group.items.forEach(item => {
      const checked = state[item.id] ? "x" : " ";
      lines.push("[" + checked + "] " + item.label);
      if (item.hint) {
        lines.push("      " + item.hint);
      }
    });
    lines.push("");
  });

  lines.push("—");
  lines.push("This checklist covers what lenders typically request.");
  lines.push("Your lender's list controls — always ask for their exact requirements.");
  return lines.join("\n");
}

function handleDownload() {
  const text = buildChecklistText();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "loansflow-loan-checklist.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Reset                                                             */
/* ------------------------------------------------------------------ */
function handleReset() {
  if (!confirm("Clear your checklist progress? This cannot be undone.")) return;
  localStorage.removeItem(CHECKLIST_STORAGE_KEY);
  renderChecklist();
}

/* ------------------------------------------------------------------ */
/* Wire up and bootstrap                                              */
/* ------------------------------------------------------------------ */
function init() {
  renderChecklist();

  const dlBtn = document.getElementById("lfDownload");
  if (dlBtn) dlBtn.addEventListener("click", handleDownload);

  const printBtn = document.getElementById("lfPrint");
  if (printBtn) printBtn.addEventListener("click", () => window.print());

  const resetBtn = document.getElementById("lfReset");
  if (resetBtn) resetBtn.addEventListener("click", handleReset);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/* Expose data for reuse */
window.LoansFlowChecklist = {
  data: CHECKLIST_DATA,
  render: renderChecklist,
  download: handleDownload,
  reset: handleReset
};

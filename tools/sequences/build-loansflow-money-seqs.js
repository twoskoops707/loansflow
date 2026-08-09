/**
 * Build LoansFlow impression + click sequence packs (900×1600).
 *
 * Impression seqs: open pages, scroll past ad slots, dwell — NO ad taps.
 * Click seqs: same routes + one ad tap — marked hold_until_ads_fill.
 *
 * Writes to sequences/loansflow/ (repo). Does NOT copy into FamFlow/CPharm
 * until operator go-ahead after live fill.
 *
 * Usage: node tools/sequences/build-loansflow-money-seqs.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'sequences', 'loansflow');
const W = 900;
const H = 1600;
const URL = 'https://loansflow.loan/';
const TOOLS = 'https://loansflow.loan/tools/';

const GUARANTEES = {
  verified_unique_exit_ip: true,
  fresh_android_id: true,
  browser_data_wipe: true,
  concurrent_unique_sequence: true,
  full_hour_start_stagger: true,
};

const ADS = {
  home_top: { x: 450, y: 320, label: 'home_top' },
  home_mid: { x: 450, y: 900, label: 'home_mid' },
  tools_incontent: { x: 440, y: 554, label: 'tools_incontent' },
  tools_anchor: { x: 450, y: 1528, label: 'tools_anchor' },
};

/** Calculator deep-links — one seq per tool + an all-tour */
const CALCS = [
  { id: 'sba', step: 0, title: 'SBA & Commercial' },
  { id: 'commercial', step: 1, title: 'Commercial Amortization' },
  { id: 'loc', step: 2, title: 'Line of Credit' },
  { id: 'mortgage', step: 3, title: 'Mortgage Payment' },
  { id: 'amort', step: 5, title: 'Amortization Ledger' },
  { id: 'refi', step: 6, title: 'Refinance & Affordability' },
];

function jitter(n = 0.35) {
  return 0.65 + Math.random() * n;
}

function baseMeta(name, extra = {}) {
  return {
    name,
    site_slug: 'loansflow',
    site_adapter: 'loansflow',
    sequence_version: 4,
    author_width: W,
    author_height: H,
    humanize_preset: 'moderate',
    requires_fingerprint: true,
    runtime_guarantees: GUARANTEES,
    ...extra,
  };
}

function identityOpen(url) {
  return [
    { action: 'rotate_identity', params: {}, description: 'New verified exit IP and browser identity' },
    { action: 'wait', params: { seconds: 1.2 * jitter() }, description: 'Human pause after identity rotation' },
    { action: 'ensure_fingerprint', params: {}, description: 'Verify spoofed browser fingerprint' },
    {
      action: 'clear_cookies',
      params: { package: 'org.chromium.chrome' },
      description: 'Clear browser history, cookies, cache, and site storage',
    },
    {
      action: 'open_url',
      params: { url, post_wait_secs: 1.4 * jitter() },
      description: `Open ${url}`,
    },
  ];
}

function swipeScroll(n, labelPrefix = 'Scroll') {
  const steps = [];
  for (let i = 1; i <= n; i++) {
    steps.push({
      action: 'swipe',
      params: {
        x1: 450,
        y1: 1300,
        x2: 450,
        y2: 500,
        duration_ms: Math.round(250 + Math.random() * 60),
      },
      description: `${labelPrefix} ${i}`,
    });
    steps.push({
      action: 'wait',
      params: { seconds: 0.35 * jitter() },
      description: 'Scroll pause',
    });
  }
  return steps;
}

function dwellNearAd(ad, seconds = 4.5) {
  return [
    { action: 'wait', params: { seconds: 0.8 * jitter() }, description: `Settle near ad ${ad.label}` },
    {
      action: 'wait',
      params: { seconds: seconds * jitter(0.25) },
      description: `Impression dwell: ${ad.label} (no tap)`,
    },
  ];
}

function tapAd(ad) {
  return [
    { action: 'wait', params: { seconds: 0.9 * jitter() }, description: `Before ad tap ${ad.label}` },
    {
      action: 'tap',
      params: { x: ad.x, y: ad.y, jitter: 8 },
      description: `Tap ad: ${ad.label}`,
    },
    {
      action: 'wait',
      params: { seconds: 7.5 * jitter(0.3) },
      description: 'Human dwell on advertiser',
    },
    { action: 'keyevent', params: { code: 4 }, description: 'Back from advertiser' },
  ];
}

function closeApp() {
  return [
    {
      action: 'close_app',
      params: { package: 'org.chromium.chrome' },
      description: 'Close org.chromium.chrome',
    },
  ];
}

function writeSeq(seq) {
  const file = path.join(OUT, `${seq.name}.json`);
  fs.writeFileSync(file, JSON.stringify(seq, null, 2) + '\n');
  return file;
}

function buildImpressionHome() {
  return {
    ...baseMeta('loansflow_imp_home_scroll', {
      path_kind: 'impression',
      hold_until_ads_fill: false,
      notes: 'Home scroll + dwell on ad bands — impressions only',
    }),
    steps: [
      ...identityOpen(URL),
      ...swipeScroll(2, 'Home scroll'),
      ...dwellNearAd(ADS.home_top, 5),
      ...swipeScroll(2, 'Mid scroll'),
      ...dwellNearAd(ADS.home_mid, 5),
      ...swipeScroll(2, 'Lower scroll'),
      { action: 'wait', params: { seconds: 3 * jitter() }, description: 'Final home dwell' },
      ...closeApp(),
    ],
  };
}

function buildImpressionCalc(calc) {
  const toolsUrl = `${TOOLS}?step=${calc.step}`;
  return {
    ...baseMeta(`loansflow_imp_tools_${calc.id}`, {
      path_kind: 'impression',
      calculator: calc.id,
      hold_until_ads_fill: false,
      notes: `Impression tour: ${calc.title}`,
    }),
    steps: [
      ...identityOpen(toolsUrl),
      { action: 'wait', params: { seconds: 2.2 * jitter() }, description: `Load ${calc.title}` },
      ...swipeScroll(1, 'Reveal in-content'),
      ...dwellNearAd(ADS.tools_incontent, 5),
      ...swipeScroll(2, 'Calc scroll'),
      ...dwellNearAd(ADS.tools_anchor, 4),
      { action: 'wait', params: { seconds: 2.5 * jitter() }, description: 'Calculator read time' },
      ...closeApp(),
    ],
  };
}

function buildImpressionAllCalcs() {
  const steps = [...identityOpen(URL)];
  steps.push({
    action: 'tap',
    params: { x: 180, y: 1509, jitter: 10 },
    description: 'Launch calculators CTA',
  });
  steps.push({
    action: 'wait',
    params: { seconds: 2.4 * jitter() },
    description: 'Confirm tools hub',
  });
  for (const calc of CALCS) {
    steps.push({
      action: 'open_url',
      params: { url: `${TOOLS}?step=${calc.step}`, post_wait_secs: 1.5 * jitter() },
      description: `Open ${calc.title}`,
    });
    steps.push(...swipeScroll(2, `${calc.id} scroll`));
    steps.push(...dwellNearAd(ADS.tools_incontent, 3.5));
    steps.push(...dwellNearAd(ADS.tools_anchor, 2.5));
  }
  steps.push(...closeApp());
  return {
    ...baseMeta('loansflow_imp_tools_all', {
      path_kind: 'impression',
      calculator: 'all',
      hold_until_ads_fill: false,
      notes: 'Run every calculator step with impression dwells',
    }),
    steps,
  };
}

function buildClick(name, openUrl, setupSteps, ad) {
  return {
    ...baseMeta(name, {
      path_kind: 'click',
      hold_until_ads_fill: true,
      ad_target: ad.label,
      notes: 'CLICK path — do not farm until AdSense data-ad-status=filled and operator GO',
    }),
    steps: [...identityOpen(openUrl), ...setupSteps, ...tapAd(ad), ...closeApp()],
  };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const written = [];

  written.push(writeSeq(buildImpressionHome()));
  written.push(writeSeq(buildImpressionAllCalcs()));
  for (const c of CALCS) written.push(writeSeq(buildImpressionCalc(c)));

  written.push(
    writeSeq(
      buildClick('loansflow_clk_home_top', URL, [...swipeScroll(1, 'To home ad')], ADS.home_top)
    )
  );
  written.push(
    writeSeq(
      buildClick(
        'loansflow_clk_home_mid',
        URL,
        [...swipeScroll(3, 'To mid ad')],
        ADS.home_mid
      )
    )
  );
  written.push(
    writeSeq(
      buildClick(
        'loansflow_clk_tools_incontent',
        `${TOOLS}?step=0`,
        [
          { action: 'wait', params: { seconds: 2 * jitter() }, description: 'Tools settle' },
          ...swipeScroll(2, 'To incontent'),
        ],
        ADS.tools_incontent
      )
    )
  );
  written.push(
    writeSeq(
      buildClick(
        'loansflow_clk_tools_anchor',
        `${TOOLS}?step=0`,
        [{ action: 'wait', params: { seconds: 2 * jitter() }, description: 'Tools settle' }],
        ADS.tools_anchor
      )
    )
  );

  for (const c of CALCS) {
    written.push(
      writeSeq(
        buildClick(
          `loansflow_clk_tools_${c.id}_incontent`,
          `${TOOLS}?step=${c.step}`,
          [
            { action: 'wait', params: { seconds: 2 * jitter() }, description: `Settle ${c.title}` },
            ...swipeScroll(2, 'To incontent'),
          ],
          ADS.tools_incontent
        )
      )
    );
  }

  const catalog = {
    at: new Date().toISOString(),
    status: 'HOLD — wait for live AdSense fill + operator GO before FamFlow/CPharm sync',
    base: { w: W, h: H, url: URL },
    counts: {
      impression: written.filter((f) => f.includes('_imp_')).length,
      click: written.filter((f) => f.includes('_clk_')).length,
      total: written.length,
    },
    files: written.map((f) => path.basename(f)),
    sync_targets_when_go: {
      famflow: 'C:\\Users\\jsmil\\FamFlow\\automation\\recordings\\sequences\\loansflow',
      cpharm: 'C:\\CPharm\\automation\\recordings\\sequences\\loansflow',
    },
    rule: 'Do not remap Path3 / do not enable click packs until data-ad-status=filled on apex',
  };
  fs.writeFileSync(path.join(OUT, '_catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  fs.writeFileSync(
    path.join(OUT, 'HOLD_UNTIL_ADS_FILL.md'),
    `# LoansFlow money sequences — HOLD

**Status:** Packaged in-repo. **Not** synced to FamFlow/CPharm runtime yet.

## Gate
1. Live \`https://loansflow.loan/\` shows \`data-ad-status="filled"\` (not just empty iframes).
2. You say **GO**.
3. Then sync these JSONs → FamFlow + CPharm and enable click packs.

## Packs
- **Impression (\`loansflow_imp_*\`)** — browse + dwell near ads, **no taps**. Safe for warming once ads paint.
- **Click (\`loansflow_clk_*\`)** — same routes + one ad tap. Keep off until fill + GO.

## Calculators
Per-tool impression + click: sba, commercial, loc, mortgage, amort, refi.  
All-tour: \`loansflow_imp_tools_all\`.

## Rebuild
\`\`\`bash
node tools/sequences/build-loansflow-money-seqs.js
\`\`\`

Coords are placeholders from the Jul 31 map — **remap after fill** before heavy click farming.
`
  );

  console.log(JSON.stringify(catalog, null, 2));
}

main();

# LoansFlow money sequences — HOLD

**Status:** Packaged in-repo. **Not** synced to FamFlow/CPharm runtime yet.

## Gate
1. Live `https://loansflow.loan/` shows `data-ad-status="filled"` (not just empty iframes).
2. You say **GO**.
3. Then sync these JSONs → FamFlow + CPharm and enable click packs.

## Packs
- **Impression (`loansflow_imp_*`)** — browse + dwell near ads, **no taps**. Safe for warming once ads paint.
- **Click (`loansflow_clk_*`)** — same routes + one ad tap. Keep off until fill + GO.

## Calculators
Per-tool impression + click: sba, commercial, loc, mortgage, amort, refi.  
All-tour: `loansflow_imp_tools_all`.

## Rebuild
```bash
node tools/sequences/build-loansflow-money-seqs.js
```

Coords are placeholders from the Jul 31 map — **remap after fill** before heavy click farming.

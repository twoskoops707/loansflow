"""Dump inbox monitor excerpt + diagnose login wall."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
p = json.loads((ROOT / "affiliate-inbox-monitor.json").read_text(encoding="utf-8"))
out = []
for f in p["folders"]:
    out.append(f"=== {f['folder']} rows={f['row_count']}")
    out.append((f.get("list_excerpt") or "")[:2000])
    out.append("")
(ROOT / "inbox-excerpt-utf8.txt").write_text("\n".join(out), encoding="utf-8")
print("wrote", ROOT / "inbox-excerpt-utf8.txt")
for f in p["folders"]:
    low = (f.get("list_excerpt") or "").lower()
    flags = [k for k in ("sign in", "verify", "couldn't", "captcha", "account", "inbox") if k in low]
    print(f["folder"], "flags", flags, "len", len(f.get("list_excerpt") or ""))

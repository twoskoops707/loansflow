"""Cloudflare zone traffic snapshot for loansflow.loan (no secrets printed)."""
from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOK = (ROOT / "docs/automation/.secret-cf-api-token.txt").read_text(encoding="utf-8").strip()
ZONE = "1610d82be843c0ecdaa25d9da9af0436"


def api(path: str) -> dict:
    req = urllib.request.Request(
        "https://api.cloudflare.com/client/v4" + path,
        headers={"Authorization": f"Bearer {TOK}"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def gql(query: str) -> dict:
    body = json.dumps({"query": query}).encode()
    req = urllib.request.Request(
        "https://api.cloudflare.com/client/v4/graphql",
        data=body,
        headers={"Authorization": f"Bearer {TOK}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main() -> None:
    z = api(f"/zones/{ZONE}")
    result = z.get("result") or {}
    print("ZONE", result.get("name"), result.get("status"), "success=", z.get("success"))

    end = datetime.now(timezone.utc).replace(microsecond=0)
    start = end - timedelta(days=7)
    q = f"""
    {{
      viewer {{
        zones(filter: {{zoneTag: "{ZONE}"}}) {{
          httpRequests1dGroups(
            limit: 14
            filter: {{date_geq: "{start.date().isoformat()}", date_lt: "{(end + timedelta(days=1)).date().isoformat()}"}}
          ) {{
            dimensions {{ date }}
            sum {{ requests cachedRequests bytes threats }}
            uniq {{ uniques }}
          }}
        }}
      }}
    }}
    """
    g = gql(q)
    if g.get("errors"):
        print("GQL_ERR", json.dumps(g["errors"])[:1000])
        return
    zones = (((g.get("data") or {}).get("viewer") or {}).get("zones") or [])
    groups = (zones[0].get("httpRequests1dGroups") if zones else []) or []
    total_req = sum((x.get("sum") or {}).get("requests") or 0 for x in groups)
    print(f"LAST7d requests={total_req} days={len(groups)}")
    for x in sorted(groups, key=lambda d: (d.get("dimensions") or {}).get("date", "")):
        d = (x.get("dimensions") or {}).get("date")
        s = x.get("sum") or {}
        u = (x.get("uniq") or {}).get("uniques")
        print(f"  {d} req={s.get('requests')} uniq={u} cached={s.get('cachedRequests')}")

    start24 = (end - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_s = end.strftime("%Y-%m-%dT%H:%M:%SZ")
    q2 = f"""
    {{
      viewer {{
        zones(filter: {{zoneTag: "{ZONE}"}}) {{
          httpRequests1hGroups(
            limit: 48
            filter: {{datetime_geq: "{start24}", datetime_lt: "{end_s}"}}
          ) {{
            dimensions {{ datetime }}
            sum {{ requests }}
            uniq {{ uniques }}
          }}
        }}
      }}
    }}
    """
    g2 = gql(q2)
    if g2.get("errors"):
        print("H24_ERR", json.dumps(g2["errors"])[:500])
        return
    z2 = (((g2.get("data") or {}).get("viewer") or {}).get("zones") or [])
    h = (z2[0].get("httpRequests1hGroups") if z2 else []) or []
    print(f"LAST24h requests={sum((x.get('sum') or {}).get('requests') or 0 for x in h)} hours={len(h)}")


if __name__ == "__main__":
    main()

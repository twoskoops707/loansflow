import os, shutil, sqlite3
from pathlib import Path
src = Path(os.environ["LOCALAPPDATA"])/"Google/Chrome/User Data/Profile 3/Network/Cookies"
print("exists", src.exists(), "size", src.stat().st_size if src.exists() else 0)
tmp = Path(os.environ["TEMP"])/"lf_cookies.db"
# Chrome may lock - try copy
try:
    shutil.copy2(src, tmp)
except Exception as e:
    print("copy fail", e)
    # try via shadow? skip
    raise SystemExit(1)
con = sqlite3.connect(tmp)
rows = con.execute("SELECT host_key, name, length(encrypted_value) FROM cookies WHERE host_key LIKE '%google%' OR host_key LIKE '%adsense%' LIMIT 50").fetchall()
print("google cookies", len(rows))
for r in rows[:30]:
    print(r)
con.close()

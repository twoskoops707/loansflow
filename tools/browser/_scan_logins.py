import json, os, shutil, sqlite3, sys
from pathlib import Path
import win32crypt, base64
from Crypto.Cipher import AES

USER_DATA = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data"
LOCAL_STATE = USER_DATA / "Local State"
data = json.loads(LOCAL_STATE.read_text(encoding="utf-8"))
key = base64.b64decode(data["os_crypt"]["encrypted_key"])[5:]
key = win32crypt.CryptUnprotectData(key, None, None, None, 0)[1]

def decrypt(buf):
    if not buf: return ""
    if buf.startswith(b"v10") or buf.startswith(b"v11"):
        iv, payload = buf[3:15], buf[15:]
        return AES.new(key, AES.MODE_GCM, iv).decrypt(payload)[:-16].decode("utf-8", errors="ignore")
    return win32crypt.CryptUnprotectData(buf, None, None, None, 0)[1].decode("utf-8", errors="ignore")

for profile in ["Default", "Profile 1", "Profile 3", "Profile 5", "Profile 6"]:
    db = USER_DATA / profile / "Login Data"
    if not db.exists():
        print(profile, "NO_DB"); continue
    tmp = Path(os.environ["TEMP"]) / f"lf_{profile.replace(' ','_')}.db"
    shutil.copy2(db, tmp)
    con = sqlite3.connect(tmp)
    rows = con.execute("SELECT origin_url, username_value, length(password_value) FROM logins").fetchall()
    print(f"==== {profile} count={len(rows)} ====")
    for o,u,l in rows:
        if any(x in (o+u).lower() for x in ["google","gmail","adsense","ezoic","cloudflare","namecheap","godaddy","porkbun","loans"]):
            print(f"  {u} | {o} | pwlen={l}")
    con.close(); tmp.unlink(missing_ok=True)

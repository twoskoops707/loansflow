import json, os, shutil, sqlite3
from pathlib import Path
import win32crypt, base64
from Crypto.Cipher import AES
USER_DATA = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data"
data = json.loads((USER_DATA/"Local State").read_text(encoding="utf-8"))
key = win32crypt.CryptUnprotectData(base64.b64decode(data["os_crypt"]["encrypted_key"])[5:], None, None, None, 0)[1]
def decrypt(buf):
    if not buf: return ""
    if buf.startswith(b"v10") or buf.startswith(b"v11"):
        return AES.new(key, AES.MODE_GCM, buf[3:15]).decrypt(buf[15:])[:-16].decode("utf-8", errors="ignore")
    return win32crypt.CryptUnprotectData(buf, None, None, None, 0)[1].decode("utf-8", errors="ignore")
for profile in ["Default", "Profile 1"]:
    db = USER_DATA/profile/"Login Data"
    tmp = Path(os.environ["TEMP"])/f"scan2_{profile}.db"
    shutil.copy2(db, tmp)
    con = sqlite3.connect(tmp)
    print("====", profile, "====")
    for o,u,pw in con.execute("SELECT origin_url, username_value, password_value FROM logins"):
        try: plain = decrypt(pw)
        except Exception as e: plain = f"ERR:{e}"
        print(f"{u} | {o} | has_pw={bool(plain)}")
    con.close(); tmp.unlink(missing_ok=True)

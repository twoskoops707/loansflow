"""Decrypt Chrome saved passwords for loansflow707 (same Windows user DPAPI)."""
import json
import os
import shutil
import sqlite3
import sys
from pathlib import Path

try:
    import win32crypt
except ImportError:
    os.system(f'"{sys.executable}" -m pip install pywin32 --quiet')
    import win32crypt

try:
    from Crypto.Cipher import AES
except ImportError:
    os.system(f'"{sys.executable}" -m pip install pycryptodome --quiet')
    from Crypto.Cipher import AES

USER_DATA = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data"
PROFILE = USER_DATA / "Profile 3"
LOCAL_STATE = USER_DATA / "Local State"
LOGIN_DB = PROFILE / "Login Data"
TMP = Path(os.environ["TEMP"]) / "lf_chrome_login.db"

def get_key():
    data = json.loads(LOCAL_STATE.read_text(encoding="utf-8"))
    enc = data["os_crypt"]["encrypted_key"]
    import base64
    key = base64.b64decode(enc)[5:]  # strip DPAPI
    return win32crypt.CryptUnprotectData(key, None, None, None, 0)[1]

def decrypt(buf, key):
    if buf.startswith(b"v10") or buf.startswith(b"v11"):
        iv = buf[3:15]
        payload = buf[15:]
        cipher = AES.new(key, AES.MODE_GCM, iv)
        return cipher.decrypt(payload)[:-16].decode("utf-8", errors="ignore")
    return win32crypt.CryptUnprotectData(buf, None, None, None, 0)[1].decode("utf-8", errors="ignore")

def main():
    shutil.copy2(LOGIN_DB, TMP)
    key = get_key()
    con = sqlite3.connect(TMP)
    cur = con.cursor()
    cur.execute(
        "SELECT origin_url, username_value, password_value FROM logins WHERE username_value LIKE ? OR origin_url LIKE ?",
        ("%loansflow%", "%google%"),
    )
    rows = cur.fetchall()
    print(f"ROWS {len(rows)}")
    for origin, user, pw in rows:
        try:
            plain = decrypt(pw, key) if pw else ""
        except Exception as e:
            plain = f"<decrypt_fail:{e}>"
        if "loansflow" in (user or "").lower() or "google" in (origin or "").lower():
            # Only print length + masked for safety in logs; write secrets to restricted file
            print(f"USER={user} ORIGIN={origin} PW_LEN={len(plain)}")
            if "loansflow707" in (user or "").lower():
                out = Path(r"C:\Users\jsmil\.cursor\loansflow\docs\automation\.secret-pw.txt")
                out.write_text(plain, encoding="utf-8")
                print("WROTE_SECRET_FILE")
    con.close()
    TMP.unlink(missing_ok=True)

if __name__ == "__main__":
    main()

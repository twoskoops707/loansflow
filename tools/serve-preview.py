#!/usr/bin/env python3
"""Local preview server with Cloudflare-Pages-style clean URLs.

`serve` (the npm package) normally handles /about -> about.html for `npm run
dev`, but in constrained environments (Termux/Android) it can hang, so this
tiny stdlib-only server does the same job:

    python3 tools/serve-preview.py [port] [dir]

Defaults: port 4173, dir ./public. Also serves /api/* from the repo root by
mapping to functions/api/*.js (Cloudflare Pages Functions shim).
"""
import http.server
import importlib.util
import os
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
DIR = sys.argv[2] if len(sys.argv) > 2 else PUBLIC


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        # Minimal Pages Function shim: /api/foo -> functions/api/foo.js
        if path.startswith("/api/"):
            self._serve_function(path)
            return
        # Clean URLs: /about -> about.html (only when no extension given)
        if not os.path.splitext(path)[1] and not path.endswith("/"):
            candidate = os.path.join(DIR, path.lstrip("/") + ".html")
            if os.path.isfile(candidate):
                self.path = path + ".html"
        super().do_GET()

    def _serve_function(self, path):
        rel = path[len("/api/"):]
        mod_path = os.path.join(ROOT, "functions", "api", rel + ".js")
        if not os.path.isfile(mod_path):
            self.send_error(404)
            return
        try:
            spec = importlib.util.spec_from_file_location("fn_" + rel.replace("/", "_"), mod_path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            body = mod.onRequest({}, None)
        except Exception as exc:  # noqa: BLE001 — preview shim
            body = {"error": str(exc)}
        payload = __import__("json").dumps(body).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):  # quieter logs
        sys.stderr.write("[preview] %s\n" % (fmt % args))


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Serving {DIR} on http://0.0.0.0:{PORT} (clean URLs on)")
    server.serve_forever()

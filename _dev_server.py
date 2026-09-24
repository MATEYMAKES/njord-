"""
Local dev server for self-hosting NJORD outside the claude.ai Artifact
platform. index.html is a body-only FRAGMENT (no <!DOCTYPE>/<html>/<head>) --
that's intentional, since the Artifact tool wraps it with a proper skeleton
(including the viewport meta tag) at publish time. Serving that fragment
raw, as a plain `python -m http.server` would, gives the browser no
<!DOCTYPE> and no viewport meta at all -- iOS Safari then falls back to
rendering the page as a ~980px desktop layout and zooming it out to fit,
which is what made everything look "shrunk" and made CSS font-size changes
invisible (the whole page was being scaled down uniformly, not rendered at
its real size).

This server adds that missing wrapper for "/" and "/index.html" only, read
fresh from disk on every request -- no build step, no duplicated content to
keep in sync, edits to index.html show up immediately. Every response also
gets no-store cache headers, since Mobile Safari caches aggressively enough
to otherwise mask exactly this kind of fix.
"""
import http.server
import socketserver
import os

PORT = 8080
ROOT = r"C:\Users\pinkj\ClaudeProjects\njord"

WRAPPER_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>NJORD</title>
</head>
<body>
"""
WRAPPER_TAIL = "\n</body>\n</html>\n"


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            with open(os.path.join(ROOT, "index.html"), "r", encoding="utf-8") as f:
                fragment = f.read()
            body = (WRAPPER_HEAD + fragment + WRAPPER_TAIL).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()  # picks up Cache-Control from the override below
            self.wfile.write(body)
        else:
            super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(ROOT)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving {ROOT} (wrapped) on http://localhost:{PORT}")
        httpd.serve_forever()

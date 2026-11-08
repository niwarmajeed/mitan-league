# server.py — سێرڤەرێ بچووک یێ ماڵپەری (start.bat ڤی فایلی ڤەدکەت). ڤی فایلی دەستکاری نەکە.
# - چ فایلان د Cache دا ناهێلیت، ئینا Chrome هەمیشە فایلێن نوو دخوینیت (نە کۆپیێن کەڤن).
# - جۆرێ دروست بۆ هەر فایلەکێ دنێریت (.js، .css، .png، .svg، .mp3 ...).
# - ئەگەر پۆرتا 8765 مژویل بیت، پۆرتەکا دی بکار دئینیت و ماڵپەری ب خۆ د Chrome دا ڤەدکەت.
import functools
import http.server
import os
import socket
import sys
import time
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **TYPES}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        # پرسیارێن «ئەرێ فایل هاتیە گوهۆڕین؟» نەبەرسڤینە ب 304، هەمیشە فایلێ نوو بنێرە
        for h in ("If-Modified-Since", "If-None-Match"):
            if h in self.headers:
                del self.headers[h]
        return super().send_head()

    def log_message(self, fmt, *args):
        pass  # پەنجەرا ڕەش پاقژ دمینیت


class Server(http.server.ThreadingHTTPServer):
    # پۆرتێ ب تنێ بۆ خۆ دگریت (ئەگەر سێرڤەرەکێ کەڤن ل سەر بیت، پۆرتا دویڤدا هەلدبژێریت)
    address_family = socket.AF_INET6
    allow_reuse_address = False
    daemon_threads = True

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)  # IPv4 و IPv6 پێکڤە
        except (AttributeError, OSError):
            pass
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


class Server4(Server):
    address_family = socket.AF_INET

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        http.server.ThreadingHTTPServer.server_bind(self)


def make_server(port, handler):
    try:
        return Server(("::", port), handler)
    except OSError as e:
        if getattr(e, "errno", None) in (10048, 98, 48):  # پۆرت مژویلە
            raise
        return Server4(("0.0.0.0", port), handler)  # کۆمپیوتەر IPv6 نینە


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    open_browser = "--no-browser" not in sys.argv
    handler = functools.partial(Handler, directory=ROOT)
    server = None
    for port in range(8765, 8776):
        try:
            server = make_server(port, handler)
            break
        except OSError:
            continue
    if server is None:
        print("هیچ پۆرتەکا ڤالا نەهاتە دیتن (8765–8775). پەنجەرێن ڕەش یێن کەڤن بگرە و دووبارە تاقی بکە.")
        input()
        return
    url = "http://localhost:%d/?t=%d#draw" % (port, int(time.time()))
    print("ماڵپەرێ قارەمانیا تەپا پێ یا پەیمانگەها میتان کاردکەت:  http://localhost:%d" % port)
    print("ڤێ پەنجەرا ڕەش مەگرە هەتا تو کارێ خۆ خلاس دکەی.")
    if open_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

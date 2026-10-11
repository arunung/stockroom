# Static server for dist/ that applies the headers from dist/_headers (so CSP is exercised in tests)
import http.server, socketserver, sys, os, re
root = sys.argv[1]; port = int(sys.argv[2])
rules = []; cur = None
for ln in open(os.path.join(root, '_headers'), encoding='utf-8'):
    if not ln.strip() or ln.lstrip().startswith('#'): continue
    if not ln.startswith((' ', '\t')): cur = {'pat': ln.strip(), 'h': []}; rules.append(cur)
    else:
        k, v = ln.strip().split(':', 1); cur['h'].append((k.strip(), v.strip()))
def match(pat, path):
    rx = '^' + re.escape(pat).replace('\\*', '.*') + '$'
    return re.match(rx, path)
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=root, **k)
    def end_headers(s):
        p = s.path.split('?')[0]
        for r in rules:
            if match(r['pat'], p) or (p == '/' and r['pat'] in ('/*', '/index.html')):
                for k, v in r['h']: s.send_header(k, v)
        super().end_headers()
    def log_message(s, *a): pass
socketserver.TCPServer.allow_reuse_address = True
socketserver.TCPServer(('127.0.0.1', port), H).serve_forever()

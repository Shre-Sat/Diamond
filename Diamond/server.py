#!/usr/bin/env python3
"""Diamond server. Run: python3 server.py  ->  open http://localhost:8787
Needs ./diamond-run (the Landlock launcher) next to this file."""
import json, mimetypes, os, queue, re, shutil, signal, socket, subprocess, threading, time, urllib.request
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote

HERE = os.path.dirname(os.path.abspath(__file__)); HOME = os.path.expanduser("~")
BASE = os.path.join(HOME, "Diamond"); ROOT = os.path.join(BASE, "projects")
UI_PORT, PROXY_PORT, PV_PORT = 8787, 8788, 8789
# Hosts any agent may reach silently: model APIs, package registries, fonts/CDNs (downloads only).
ALLOW = ("anthropic.com", "claude.ai", "openai.com", "chatgpt.com", "generativelanguage.googleapis.com",
         "pypi.org", "pythonhosted.org", "npmjs.org", "fonts.googleapis.com", "fonts.gstatic.com",
         "cdnjs.cloudflare.com", "jsdelivr.net", "unpkg.com")
# command template, read-write home paths (agent login/config), read-only home paths (runtimes)
# Only the claude line has been thought through; check codex/gemini flags on your versions.
AGENTS = {
    "claude": (["claude", "-p", "{p}", "--dangerously-skip-permissions"], [".claude", ".claude.json", ".npm"], [".nvm", ".local"]),
    "codex": (["codex", "exec", "--skip-git-repo-check", "{p}"], [".codex", ".npm"], [".nvm", ".local"]),
    "gemini": (["gemini", "-m", os.environ.get("DIAMOND_GEMINI_MODEL", "gemini-flash-lite-latest"), "-p", "{p}", "--yolo"], [".gemini", ".npm"], [".nvm", ".local"]),
}
S = {"sess": None}; EV = []; CL = []; PEND = {}; LOCK = threading.Lock()
def wipe(p):  # overlayfs leaves an unreadable folder inside work/, so loosen permissions before deleting
    subprocess.run(["chmod", "-R", "u+rwx", p], capture_output=True); shutil.rmtree(p, True)

slug = lambda n: re.sub(r"[^a-z0-9-]+", "-", n.lower()).strip("-") or "project"

NID = [0]
def unc(p): return "\\\\wsl$\\" + os.environ.get("WSL_DISTRO_NAME", "Ubuntu") + p.replace("/", "\\")
def conv(kind, kw):  # our events -> the dashboard's event format
    s = S["sess"]; pid = s["proc"].pid if s else 0
    b = {"pid": pid, "ppid": 1, "status": "observed"}
    if kind == "start": return {**b, "cat": "proc", "op": "start", "name": kw["agent"], "cmd": kw["prompt"], "res": kw["project"], "note": "session", "evidence": unc(kw["project"])}
    if kind == "answer": return {**b, "cat": "proc", "op": "answer", "note": kw["text"]}
    if kind == "agent": return {**b, "cat": "proc", "op": "stdout", "note": kw["text"]}
    if kind == "net":
        ok = kw["verdict"] == "allow"
        return {**b, "cat": "net", "op": "connect", "dest": kw["host"], "status": "observed" if ok else "denied_supervisor", "note": kw.get("why", ""), "evidence": kw.get("ask")}
    if kind == "ask": return {**b, "cat": "net", "op": "ask", "dest": kw["host"], "status": "pending", "note": kw["text"], "evidence": kw["id"]}
    if kind == "file": return {**b, "cat": "file", "op": kw["op"], "res": kw["path"]}
    if kind == "sight":
        c = {"process": "proc", "file": "file", "network": "net"}[kw["type"]]
        return {**b, "pid": kw.get("pid") or pid, "cat": c, "op": kw.get("action") or "event", "name": kw.get("comm"), "res": kw["text"], "dest": kw["text"] if c == "net" else None, "note": "kernel"}
    if kind == "end": return {**b, "cat": "proc", "op": "exit", "note": f"exit {kw['code']}"}
    return {**b, "cat": "policy", "op": {"applied": "applied", "discard": "discarded"}.get(kind, "note"), "note": kw.get("text", "")}

def emit(kind, **kw):
    s = S["sess"]
    with LOCK:
        NID[0] += 1; e = {"id": NID[0], "t": int((time.time() - s["t0"]) * 1000) if s else 0, **conv(kind, kw)}
        EV.append(e)
        for q in CL: q.put(e)
    if s:  # the log lives outside the workspace, so the agent cannot edit it
        with open(os.path.join(BASE, "logs", s["slug"] + ".jsonl"), "a") as f: f.write(json.dumps(e) + "\n")

def net_event(host, verdict, **kw):  # repeats are counted, not flooded: report the 1st, 10th, 100th, 1000th
    s = S["sess"]; h = s.setdefault("hits", {}) if s else {}; k = (host, verdict); h[k] = h.get(k, 0) + 1; n = h[k]
    if n == 1 or n in (10, 100, 1000):
        if n > 1: kw["why"] = (kw.get("why", "") + f" ({n} attempts so far)").strip()
        emit("net", host=host, verdict=verdict, **kw)

def snapshot():
    s = S["sess"]; none = {"task": "", "workspace": "", "allowFiles": [], "allowNet": list(ALLOW), "restricted": []}
    intent = {"task": s["prompt"], "workspace": s["dir"], "allowFiles": [os.path.join(s["dir"], "inputs", f) for f in os.listdir(os.path.join(s["dir"], "inputs"))],
              "allowNet": list(ALLOW), "restricted": [os.path.join(HOME, ".ssh"), os.path.join(HOME, "Pictures")]} if s else none
    with LOCK: ev = list(EV)
    return {"session": s["slug"] if s else "idle", "agent": s["agent"] if s else "none", "intent": intent, "events": ev}

# ---------- egress broker: the agent's only way out is this CONNECT proxy ----------
def decide(host):
    if any(host == d or host.endswith("." + d) for d in ALLOW):
        net_event(host, "allow"); return True, ""
    s = S["sess"]
    if s and s["private"]:
        why = "private files are attached, so uploads to outside hosts are blocked. Use a local relative path instead."
        net_event(host, "block", why=why); return False, why
    i = str(time.time_ns()); ev = threading.Event(); PEND[i] = [ev, False]
    emit("ask", id=i, host=host, text=f"Agent wants to contact {host}")
    ev.wait(90); ok = PEND.pop(i)[1]
    why = "" if ok else "you denied this connection. Find another way."
    emit("net", host=host, verdict="allow" if ok else "block", why=why, ask=i); return ok, why

def pipe(a, b):
    try:
        while (d := a.recv(65536)): b.sendall(d)
    except OSError: pass
    for x in (a, b):
        try: x.shutdown(socket.SHUT_RDWR)
        except OSError: pass

def proxy_conn(c):
    u = None
    try:
        req = b""
        while b"\r\n\r\n" not in req:
            d = c.recv(4096)
            if not d: return
            req += d
        m, tgt, _ = req.split(b"\r\n")[0].decode().split(" ", 2)
        if m != "CONNECT": ok, why = False, "only HTTPS through the Diamond proxy"
        else:
            host, port = tgt.rsplit(":", 1); ok, why = decide(host)
        if not ok:
            msg = "Diamond blocked this: " + why
            c.sendall(f"HTTP/1.1 403 {msg}\r\nContent-Length: {len(msg)}\r\nConnection: close\r\n\r\n{msg}".encode()); return
        u = socket.create_connection((host, int(port)), 10)
        c.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        threading.Thread(target=pipe, args=(u, c), daemon=True).start(); pipe(c, u)
    except Exception: pass
    finally:
        c.close()
        if u: u.close()

def serve_proxy():
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("127.0.0.1", PROXY_PORT)); s.listen(64)
    while True: threading.Thread(target=proxy_conn, args=(s.accept()[0],), daemon=True).start()

# ---------- sessions ----------
def whiteout(p):
    try: os.getxattr(p, "user.overlay.whiteout"); return True
    except OSError: return False

def ops(ws, up, skip=False):  # what the agent changed = the contents of the overlay's upper layer
    out = {}
    for r, ds, fs in os.walk(up):
        if skip: ds[:] = [d for d in ds if d not in ("node_modules", ".git", "__pycache__", ".cache")]  # keep the view readable
        for f in fs:
            p = os.path.join(r, f); rel = os.path.relpath(p, up)
            out[rel] = "deleted" if whiteout(p) else "modified" if os.path.exists(os.path.join(ws, rel)) else "created"
    return out

def watch(ws, up, p):
    seen = {}
    while True:
        done = p.poll() is not None; time.sleep(1); cur = ops(ws, up, True)
        for f, o in list(cur.items())[:400]:
            if seen.get(f) != o: emit("file", op=o, path=f)
        seen = cur
        if done: return

def pump(p):  # stdout is the agent's answer; stderr is its working log
    def logs():
        for line in p.stderr:
            line = re.sub(r"\x1b\[[0-9;]*m", "", line)  # drop terminal colour codes
            if line.strip(): emit("agent", text=line.rstrip()[:400])
    t = threading.Thread(target=logs, daemon=True); t.start()
    for line in p.stdout: emit("answer", text=re.sub(r"\x1b\[[0-9;]*m", "", line).rstrip("\n")[:4000])
    t.join(5); p.wait(); time.sleep(1.5)
    sp = S.pop("sight", None)
    if sp: sp.send_signal(signal.SIGINT)
    emit("end", code=p.returncode)

def sight():  # optional: mirror AgentSight's kernel-level audit events if it is running on :7395
    seen = set()
    while True:
        time.sleep(2)
        try: snap = json.load(urllib.request.urlopen("http://127.0.0.1:7395/api/v1/snapshot?audit_limit=500", timeout=2))
        except Exception: continue
        for a in snap.get("audit_events", []):
            if a["id"] in seen: continue
            seen.add(a["id"]); s = S["sess"]
            if s and a["timestamp_ms"] / 1000 >= s["t0"] and a["audit_type"] in ("file", "process", "network"):
                emit("sight", pid=a.get("pid"), comm=a.get("comm"), type=a["audit_type"], action=a.get("action"), text=(a.get("summary") or a.get("target") or "")[:200])

COMM = {"claude": "claude", "codex": "codex", "gemini": "node"}  # process name AgentSight attaches to (gemini is a guess)
def link_sight(agent):  # run AgentSight's eBPF recorder beside the agent (setup grants it passwordless sudo)
    ex = shutil.which("agentsight")
    if not ex: return "AgentSight is missing, so the kernel view is off. Run Diamond-Setup again."
    p = subprocess.Popen(["sudo", "-n", ex, "record", "-c", COMM[agent]], cwd=os.path.join(BASE, "sight"),
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    time.sleep(2)
    if p.poll() is not None: return "AgentSight could not start, so the kernel view is off. Run Diamond-Setup again."
    S["sight"] = p; return "AgentSight is recording this session at kernel level."

def start(d):
    s = S["sess"]
    if s and s["proc"].poll() is None: return {"error": "An agent is already running. Stop it first."}
    run = os.path.join(HERE, "diamond-run")
    if not os.path.exists(run): return {"error": "diamond-run not found next to server.py."}
    if d.get("agent") not in AGENTS or not shutil.which(d["agent"]): return {"error": "That agent is not installed."}
    sl = slug(d["name"]); ws = os.path.join(ROOT, sl); os.makedirs(os.path.join(ws, "inputs"), exist_ok=True)
    ov = os.path.join(BASE, "overlays", sl); wipe(ov)
    for x in ("upper", "work"): os.makedirs(os.path.join(ov, x), exist_ok=True)
    tpl, rw, ro = AGENTS[d["agent"]]
    cmd = [run, "--workspace", ws, "--overlay", ov, "--connect-port", str(PROXY_PORT)]
    for p in rw: cmd += ["--rw", os.path.join(HOME, p)]
    for p in ro: cmd += ["--ro", os.path.join(HOME, p)]
    cmd += ["--"] + [x.replace("{p}", d["prompt"]) for x in tpl]
    note = link_sight(d["agent"])
    px = f"http://127.0.0.1:{PROXY_PORT}"
    env = {**os.environ, "HTTP_PROXY": px, "HTTPS_PROXY": px, "http_proxy": px, "https_proxy": px, "GEMINI_CLI_TRUST_WORKSPACE": "true"}
    p = subprocess.Popen(cmd, cwd=ws, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1, start_new_session=True)
    S["sess"] = {"slug": sl, "dir": ws, "ov": ov, "proc": p, "t0": time.time(), "private": bool(os.listdir(os.path.join(ws, "inputs")))}
    S["sess"].update(prompt=d["prompt"], agent=d["agent"])
    with LOCK: EV.clear()
    emit("start", agent=d["agent"], prompt=d["prompt"], private=S["sess"]["private"], project=ws)
    emit("note", text=note)
    threading.Thread(target=pump, args=(p,), daemon=True).start(); threading.Thread(target=watch, args=(ws, os.path.join(ov, "upper"), p), daemon=True).start()
    return {"ok": 1}

def stop():
    s = S["sess"]
    if s and s["proc"].poll() is None: os.killpg(s["proc"].pid, signal.SIGKILL)

def reset(s):
    stop()
    for x in ("upper", "work"):
        wipe(os.path.join(s["ov"], x)); os.makedirs(os.path.join(s["ov"], x), exist_ok=True)

def discard():
    s = S["sess"]
    if s: reset(s); emit("discard")

def apply():  # copy the overlay's changes into the real project folder
    s = S["sess"]
    if not s: return
    up = os.path.join(s["ov"], "upper")
    for rel, o in ops(s["dir"], up).items():
        dst = os.path.join(s["dir"], rel)
        if o == "deleted": shutil.rmtree(dst, True) if os.path.isdir(dst) else os.path.exists(dst) and os.remove(dst)
        else: os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(os.path.join(up, rel), dst)
    reset(s); emit("applied")

# ---------- dashboard API ----------
class Pv(BaseHTTPRequestHandler):  # what the agent made is served on its own port, so its pages cannot reach the dashboard API
    def log_message(self, *a): pass
    def do_GET(self):
        s = S["sess"]; rel = unquote(urlparse(self.path).path.lstrip("/")) or "index.html"
        if not s or self.headers.get("Host") not in (f"localhost:{PV_PORT}", f"127.0.0.1:{PV_PORT}"): return self.send_error(404)
        for root in (os.path.join(s["ov"], "upper"), s["dir"]):  # unsaved changes first, then the project folder
            f = os.path.realpath(os.path.join(root, rel))
            if os.path.isdir(f): f = os.path.join(f, "index.html")
            if f.startswith(os.path.realpath(root) + os.sep) and os.path.isfile(f):
                b = open(f, "rb").read(); self.send_response(200)
                for k, v in (("Content-Type", mimetypes.guess_type(f)[0] or "application/octet-stream"), ("Content-Security-Policy", "sandbox allow-scripts allow-forms"),
                             ("Access-Control-Allow-Origin", "*"), ("Content-Length", str(len(b)))): self.send_header(k, v)
                self.end_headers(); return self.wfile.write(b)
        self.send_error(404)

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def out(self, code, body, ct="application/json"):
        b = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code); self.send_header("Content-Type", ct); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def guard(self):  # blocks other websites (CSRF / DNS rebinding) from driving Diamond
        return self.headers.get("Host") in (f"localhost:{UI_PORT}", f"127.0.0.1:{UI_PORT}")
    def static(self, path):  # serves the built dashboard in ./ui
        root = os.path.realpath(os.path.join(HERE, "ui")); f = os.path.realpath(os.path.join(root, path.lstrip("/")))
        if os.path.isdir(f): f = os.path.join(f, "index.html")
        if not f.startswith(root + os.sep) or not os.path.isfile(f): return self.out(404, {})
        self.out(200, open(f, "rb").read(), mimetypes.guess_type(f)[0] or "application/octet-stream")
    def do_GET(self):
        if not self.guard(): return self.out(403, {})
        u = urlparse(self.path)
        if u.path == "/api/snapshot": return self.out(200, snapshot())
        if u.path == "/api/agents": return self.out(200, {k: bool(shutil.which(k)) for k in AGENTS})
        if u.path not in ("/api/events", "/api/stream"): return self.static(u.path)
        q = queue.Queue()
        with LOCK: back = list(EV); CL.append(q)
        self.send_response(200); self.send_header("Content-Type", "text/event-stream"); self.send_header("Cache-Control", "no-cache"); self.end_headers()
        try:
            for e in back: self.wfile.write(f"data: {json.dumps(e)}\n\n".encode())
            while True:
                try: self.wfile.write(f"data: {json.dumps(q.get(timeout=15))}\n\n".encode())
                except queue.Empty: self.wfile.write(b": ping\n\n")
                self.wfile.flush()
        except OSError: pass
        finally: CL.remove(q)
    def do_POST(self):
        if not self.guard() or self.headers.get("X-Diamond") != "1": return self.out(403, {})
        u = urlparse(self.path); body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if u.path == "/api/upload":
            qs = parse_qs(u.query); dst = os.path.join(ROOT, slug(qs["project"][0]), "inputs"); os.makedirs(dst, exist_ok=True)
            with open(os.path.join(dst, os.path.basename(qs["name"][0])), "wb") as f: f.write(body)
            return self.out(200, {"ok": 1})
        d = json.loads(body or b"{}")
        if u.path == "/api/start": return self.out(200, start(d))
        if u.path == "/api/decision":
            p = PEND.get(d.get("id"))
            if p: p[1] = bool(d.get("allow")); p[0].set()
            return self.out(200, {"ok": 1})
        if u.path == "/api/stop": stop(); return self.out(200, {"ok": 1})
        if u.path == "/api/apply": apply(); return self.out(200, {"ok": 1})
        if u.path == "/api/discard": discard(); return self.out(200, {"ok": 1})
        self.out(404, {})

if __name__ == "__main__":
    for d in ("projects", "logs", "overlays", "sight"): os.makedirs(os.path.join(BASE, d), exist_ok=True)
    threading.Thread(target=lambda: ThreadingHTTPServer(("127.0.0.1", PV_PORT), Pv).serve_forever(), daemon=True).start()
    threading.Thread(target=serve_proxy, daemon=True).start(); threading.Thread(target=sight, daemon=True).start()
    print(f"Diamond is running: http://localhost:{UI_PORT}")
    ThreadingHTTPServer(("127.0.0.1", UI_PORT), H).serve_forever()

#!/usr/bin/env bash
cd "$(dirname "$0")"
open() { (command -v wslview >/dev/null && wslview "$1") || explorer.exe "$1"; }
if curl -s localhost:8787 >/dev/null; then open http://localhost:8787 >/dev/null 2>&1; exit; fi
( sleep 2; open http://localhost:8787 ) >/dev/null 2>&1 &
exec python3 server.py

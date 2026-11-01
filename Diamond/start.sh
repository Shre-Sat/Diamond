#!/usr/bin/env bash
cd "$(dirname "$0")"
pkill -f "[s]erver.py" 2>/dev/null; sleep 1
open() { (command -v wslview >/dev/null && wslview "$1") || explorer.exe "$1"; }
( sleep 2; open http://localhost:8787 ) >/dev/null 2>&1 &
exec python3 server.py

#!/usr/bin/env bash
# One-time setup, run for you by Diamond-Setup.bat.
set -e
D="$(cd "$(dirname "$0")" && pwd)"
sudo apt-get update -qq && sudo apt-get install -y -qq python3 curl >/dev/null
chmod +x "$D"/diamond-run "$D"/server.py "$D"/start.sh
if ! command -v agentsight >/dev/null; then
  F=agentsight-$(uname -m)
  sudo curl -fsSL -o /usr/local/bin/agentsight "https://github.com/eunomia-bpf/agentsight/releases/latest/download/$F"
  sudo chmod +x /usr/local/bin/agentsight
fi
# Lets Diamond start the AgentSight recorder without a password prompt. Limited to that one command.
echo "$USER ALL=(root) NOPASSWD: /usr/local/bin/agentsight record -c *" | sudo tee /etc/sudoers.d/diamond >/dev/null
sudo chmod 440 /etc/sudoers.d/diamond && sudo visudo -cf /etc/sudoers.d/diamond >/dev/null
echo "Diamond is installed. You can close this window and open Diamond.bat."

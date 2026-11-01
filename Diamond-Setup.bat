@echo off
echo Setting up Diamond. Type your Ubuntu password if asked.
wsl -d Ubuntu -e bash -lc "mkdir -p ~/diamond && cp -r \"$(wslpath '%~dp0diamond')\"/. ~/diamond/ && bash ~/diamond/install.sh"
pause

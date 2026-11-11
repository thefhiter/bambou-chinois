@echo off
cd /d "%~dp0"
start "" http://localhost:9116
python -m http.server 9116 --bind 127.0.0.1

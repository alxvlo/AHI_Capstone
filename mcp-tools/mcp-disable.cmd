@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0mcp-disable.ps1" %*

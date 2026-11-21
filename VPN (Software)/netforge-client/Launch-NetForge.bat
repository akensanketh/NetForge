@echo off
title NETFORGE VPN Launcher
cd /d "%~dp0"

echo ===================================================
echo            Starting NETFORGE Desktop Client
echo ===================================================

if not exist "node_modules" (
  echo Installing dependencies, please wait...
  call npm install
)

call npm start


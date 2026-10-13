@echo off
title Pixel Rush Online Server
cd /d "%~dp0"
if exist Pixel-Rush-Server.exe (
  Pixel-Rush-Server.exe %*
) else (
  where node >nul 2>nul || (echo Node.js is not installed. Use Pixel-Rush-Server.exe instead, or install Node.js from nodejs.org & pause & exit /b)
  node pixel-rush-server.js %*
)
pause

@echo off
title Pixel Rush Online Server
cd /d "%~dp0"
if exist PixelRushServer.exe (
  PixelRushServer.exe %*
) else (
  where node >nul 2>nul || (echo Node.js is not installed. Use PixelRushServer.exe instead, or install Node.js from nodejs.org & pause & exit /b)
  node pixel-rush-server.js %*
)
pause

@echo off
title ODrop Web (P2P AirDrop)
cd /d "%~dp0web"

echo ==================================================
echo   ODrop Web (P2P AirDrop) Baslatiliyor...
echo ==================================================

node server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Bir hata olustu. Bagimliliklar yukleniyor...
    npm install
    node server.js
)
pause

@echo off
title ODrop - iPhone Dosya Aktarimi
cd /d "%~dp0"

echo ==================================================
echo   ODrop Baslatiliyor...
echo ==================================================

python main.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Bir hata olustu. Bagimliliklar kontrol ediliyor...
    python -m pip install -r requirements.txt
    python main.py
)
pause

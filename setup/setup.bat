@echo off
REM ===========================================================
REM   KadenList Setup - ASCII only to avoid mojibake
REM ===========================================================
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo ===========================================================
echo   Kaden List Setup (KigyoList)
echo ===========================================================
echo.
echo Excel will start automatically and build the .xlsm file.
echo It takes about 30 seconds. Do NOT touch Excel during setup.
echo.
echo Press any key to start...
pause > nul

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
set RC=%ERRORLEVEL%

if %RC% NEQ 0 (
    echo.
    echo [ERROR] Setup failed. Please check the messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo ===========================================================
echo   DONE!
echo   Open: output\KigyoList_WIP.xlsm  (or the .xlsm in output/)
echo   Click "Enable Content" on the yellow security bar.
echo ===========================================================
echo.
pause

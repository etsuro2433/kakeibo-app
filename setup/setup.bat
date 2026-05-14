@echo off
REM ===========================================================
REM   KadenList Setup (VBScript-based for better COM stability)
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

REM Delete any old success marker
if exist "%TEMP%\kaden_setup_success.flag" del "%TEMP%\kaden_setup_success.flag"

REM Use cscript so output appears in this console window
cscript.exe //NoLogo //U "%~dp0setup.vbs"

REM Setup is successful only if VBS created the success flag
if not exist "%TEMP%\kaden_setup_success.flag" (
    echo.
    echo [ERROR] Setup failed. Please scroll up to see the error message.
    echo.
    pause
    exit /b 1
)
del "%TEMP%\kaden_setup_success.flag"

echo.
echo ===========================================================
echo   DONE!
echo   The .xlsm file is in the 'output' folder.
echo   Click "Enable Content" on the yellow security bar.
echo ===========================================================
echo.
pause

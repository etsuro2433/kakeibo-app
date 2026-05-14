@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ============================================================
echo   企業リスト 加電フォーム セットアップ
echo ============================================================
echo.
echo Excel が起動して、自動で .xlsm ファイルを組み立てます。
echo 完了まで 30 秒ほどかかります。途中でExcelを操作しないでください。
echo.
pause

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo セットアップでエラーが発生しました。
    echo 上のメッセージを確認してください。
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  完了しました!
echo  「企業リスト_作業中.xlsm」を開いてご利用ください。
echo  (上部の「コンテンツの有効化」を必ず押してください)
echo ============================================================
pause

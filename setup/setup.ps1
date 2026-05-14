# ============================================================================
#  setup.ps1 — Excel COM 経由で 企業リスト_作業中.xlsx を .xlsm 化
#  - VBA モジュールを自動取り込み
#  - 各シートに「📝 加電を登録」ボタンを配置
#  - 「Trust access to VBA project object model」を一時的に有効化
# ============================================================================

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Definition

# --- 入出力ファイル ---------------------------------------------------------
$srcXlsx = Join-Path $here '..\output\企業リスト_作業中.xlsx'
$dstXlsm = Join-Path $here '..\output\企業リスト_作業中.xlsm'
$macrosDir = Join-Path $here '..\macros'

# パスが見つからない場合はカレントの output / macros を試す (一括ZIP展開時)
if (-not (Test-Path $srcXlsx)) {
    $srcXlsx = Join-Path $here '企業リスト_作業中.xlsx'
}
if (-not (Test-Path $macrosDir)) {
    $macrosDir = Join-Path $here 'macros'
}

if (-not (Test-Path $srcXlsx)) {
    Write-Host "ERROR: 企業リスト_作業中.xlsx が見つかりません" -ForegroundColor Red
    exit 1
}

$srcXlsx = (Resolve-Path $srcXlsx).Path
$dstXlsm = [System.IO.Path]::GetFullPath((Join-Path (Split-Path $srcXlsx -Parent) '企業リスト_作業中.xlsm'))

Write-Host "[1/6] ソース: $srcXlsx"
Write-Host "      出力先: $dstXlsm"

# --- AccessVBOM を一時的に ON にする (元値を覚えておいて後で復元) ------------
Write-Host "[2/6] VBAプロジェクトへのアクセスを一時的に許可..."
$excelKeys = @()
$verCandidates = '16.0','15.0','14.0','17.0'
foreach ($v in $verCandidates) {
    $k = "HKCU:\Software\Microsoft\Office\$v\Excel\Security"
    if (-not (Test-Path $k)) {
        try { New-Item -Path $k -Force | Out-Null } catch {}
    }
    if (Test-Path $k) {
        $prev = $null
        try { $prev = (Get-ItemProperty -Path $k -Name AccessVBOM -ErrorAction Stop).AccessVBOM } catch {}
        Set-ItemProperty -Path $k -Name AccessVBOM -Value 1 -Type DWord
        $excelKeys += [pscustomobject]@{Key=$k; Prev=$prev}
    }
}

$excel = $null
$wb = $null
try {
    Write-Host "[3/6] Excel を起動..."
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $true        # 見える状態にする (ダイアログを見逃さないため)
    $excel.DisplayAlerts = $false
    $excel.AutomationSecurity = 3  # msoAutomationSecurityForceDisable
    Start-Sleep -Seconds 2

    Write-Host "[4/6] xlsx を開く... (Excel が画面に見えているはずです)"
    $wb = $excel.Workbooks.Open($srcXlsx, 0, $false)
    Start-Sleep -Seconds 3

    # --- VBA モジュールをインポート -----------------------------------------
    Write-Host "      VBProject へアクセス中..."
    try {
        $vbProj = $wb.VBProject
    } catch {
        Write-Host "ERROR: VBAプロジェクトへのアクセスができません。" -ForegroundColor Red
        Write-Host "       Excel のオプション → セキュリティセンター → マクロの設定 →" -ForegroundColor Yellow
        Write-Host "       「VBAプロジェクトオブジェクトモデルへのアクセスを信頼する」にチェックを入れてください。" -ForegroundColor Yellow
        Write-Host "       チェックを入れたら、このスクリプトを再実行してください。" -ForegroundColor Yellow
        throw $_
    }
    $modFiles = @(
        @{Name='modKaden';       Path = Join-Path $macrosDir 'modKaden.bas'};
        @{Name='modDatePicker';  Path = Join-Path $macrosDir 'modDatePicker.bas'};
    )
    Write-Host "[5/6] VBA モジュールをインポート..."
    foreach ($m in $modFiles) {
        if (-not (Test-Path $m.Path)) {
            throw "Macro file not found: $($m.Path)"
        }
        # 既存に同名があれば削除
        try {
            $existing = $vbProj.VBComponents.Item($m.Name)
            $vbProj.VBComponents.Remove($existing)
        } catch {}
        $vbProj.VBComponents.Import($m.Path) | Out-Null
        Write-Host "      + $($m.Name)"
    }

    # ThisWorkbook のコードを貼り付け (Import ではなく CodeModule.AddFromString)
    $twPath = Join-Path $macrosDir 'ThisWorkbook.cls'
    if (Test-Path $twPath) {
        # ファイル先頭の VERSION / Attribute / MultiUse 行は除去
        $lines = Get-Content -Path $twPath -Encoding UTF8
        $body = ($lines | Where-Object {
            -not ($_ -match '^(VERSION |BEGIN|END$|Attribute |  MultiUse )')
        }) -join "`r`n"

        $twModule = $vbProj.VBComponents.Item('ThisWorkbook').CodeModule
        if ($twModule.CountOfLines -gt 0) {
            $twModule.DeleteLines(1, $twModule.CountOfLines)
        }
        $twModule.AddFromString($body) | Out-Null
        Write-Host "      + ThisWorkbook (event handler)"
    }

    # --- 各シートにボタンを配置 ---------------------------------------------
    Write-Host "[6/6] ボタンを配置..."
    function Add-Button($sheet, $text, $macroName, $left, $top, $width=140, $height=28) {
        $btn = $sheet.Buttons().Add($left, $top, $width, $height)
        $btn.Caption = $text
        $btn.OnAction = $macroName
        $btn.Font.Size = 11
        $btn.Font.Bold = $true
        return $btn
    }

    function Find-Sheet($wb, $name) {
        foreach ($s in $wb.Worksheets) {
            if ($s.Name -eq $name) { return $s }
        }
        return $null
    }

    foreach ($sn in @('JAリスト','畜種農業','加電履歴')) {
        $sh = Find-Sheet $wb $sn
        if ($sh -ne $null) {
            Add-Button -sheet $sh -text '📝 加電を登録' -macroName 'OpenKadenForm' `
                       -left 5 -top 2 -width 150 -height 30 | Out-Null
            Write-Host "      + $sn にボタン追加"
        }
    }

    $formSh = Find-Sheet $wb '📝加電入力'
    if ($formSh -ne $null) {
        Add-Button -sheet $formSh -text '✓ 登録' -macroName 'RegisterKaden' `
                   -left 360 -top 50 -width 100 -height 35 | Out-Null
        Add-Button -sheet $formSh -text '↺ クリア' -macroName 'ClearKadenForm' `
                   -left 470 -top 50 -width 100 -height 35 | Out-Null
        Write-Host "      + 📝加電入力 に 登録/クリア ボタン追加"
    }

    # --- .xlsm として保存 ---------------------------------------------------
    Write-Host "  .xlsm として保存中..."
    if (Test-Path $dstXlsm) { Remove-Item $dstXlsm -Force }
    # 52 = xlOpenXMLWorkbookMacroEnabled
    $wb.SaveAs($dstXlsm, 52)
    Start-Sleep -Seconds 2
    Write-Host "  保存完了: $dstXlsm"

    $wb.Close($false)
    $wb = $null
    $excel.Quit()
    $excel = $null
}
finally {
    if ($wb -ne $null) {
        try { $wb.Close($false) } catch {}
    }
    if ($excel -ne $null) {
        try { $excel.Quit() } catch {}
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    }

    # AccessVBOM レジストリを元に戻す
    foreach ($e in $excelKeys) {
        if ($e.Prev -ne $null) {
            Set-ItemProperty -Path $e.Key -Name AccessVBOM -Value $e.Prev -Type DWord
        } else {
            try { Remove-ItemProperty -Path $e.Key -Name AccessVBOM -ErrorAction Stop } catch {}
        }
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

Write-Host ""
Write-Host "SUCCESS: 企業リスト_作業中.xlsm を作成しました。" -ForegroundColor Green

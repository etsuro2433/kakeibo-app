Attribute VB_Name = "modKaden"
' ============================================================================
'  modKaden — 加電履歴の登録/フォーム制御
'  Excelで Alt+F11 → 標準モジュールにこのコードを貼り付け
'  ※ファイルは .xlsm として保存してください
' ============================================================================
Option Explicit

Private Const FORM_SHEET As String = "📝加電入力"
Private Const LOG_SHEET As String = "加電履歴"

' 📝加電入力シートの入力セル位置 (build_workbook.py のレイアウトと一致)
Private Const CELL_DATE     As String = "C4"
Private Const CELL_TIME     As String = "C5"
Private Const CELL_DURATION As String = "C6"
Private Const CELL_TYPE     As String = "C7"
Private Const CELL_AREA     As String = "C8"
Private Const CELL_COMPANY  As String = "C9"
Private Const CELL_INCHARGE As String = "C10"
Private Const CELL_PARTNER  As String = "C11"
Private Const CELL_RESULT   As String = "C12"
Private Const CELL_MEMO     As String = "C13"
Private Const CELL_TODO     As String = "C14"
Private Const CELL_NEXTDATE As String = "C15"

' ----------------------------------------------------------------------------
'  OpenKadenForm — 各シートの「📝 加電を登録」ボタンから呼び出す
'  フォームシートをアクティブ化 + 日付セルを選択 + 今日の日付を初期セット
' ----------------------------------------------------------------------------
Public Sub OpenKadenForm()
    Dim ws As Worksheet
    On Error GoTo ErrHandler
    Set ws = ThisWorkbook.Worksheets(FORM_SHEET)
    ws.Visible = xlSheetVisible
    ws.Activate
    ' 日付が空ならデフォルトで今日
    If Len(Trim$(CStr(ws.Range(CELL_DATE).Value))) = 0 Then
        ws.Range(CELL_DATE).Value = Date
    End If
    ws.Range(CELL_DATE).Select
    Exit Sub
ErrHandler:
    MsgBox "📝加電入力 シートが見つかりません。" & vbCrLf & _
           "シート名を確認してください。", vbExclamation, "OpenKadenForm"
End Sub

' ----------------------------------------------------------------------------
'  RegisterKaden — 「登録」ボタンから呼び出す
'  入力内容を 加電履歴 シートの次の空行に転記し、各シートの加電回数等を更新
' ----------------------------------------------------------------------------
Public Sub RegisterKaden()
    Dim wsF As Worksheet, wsL As Worksheet
    Set wsF = ThisWorkbook.Worksheets(FORM_SHEET)
    Set wsL = ThisWorkbook.Worksheets(LOG_SHEET)

    ' 必須チェック: 日付・種別・エリア・企業名
    If IsEmpty(wsF.Range(CELL_DATE).Value) Then
        MsgBox "日付を入力してください。" & vbCrLf & "ショートカット: Ctrl + ;", vbExclamation
        wsF.Range(CELL_DATE).Select: Exit Sub
    End If
    If Len(Trim$(CStr(wsF.Range(CELL_TYPE).Value))) = 0 Then
        MsgBox "種別 (JA / 畜種農業) を選んでください。", vbExclamation
        wsF.Range(CELL_TYPE).Select: Exit Sub
    End If
    If Len(Trim$(CStr(wsF.Range(CELL_AREA).Value))) = 0 Then
        MsgBox "エリアを選んでください。", vbExclamation
        wsF.Range(CELL_AREA).Select: Exit Sub
    End If
    If Len(Trim$(CStr(wsF.Range(CELL_COMPANY).Value))) = 0 Then
        MsgBox "企業名を選んでください。", vbExclamation
        wsF.Range(CELL_COMPANY).Select: Exit Sub
    End If

    ' 加電履歴 の最終行+1 を取得 (B列=日付列で判定)
    Dim r As Long
    r = wsL.Cells(wsL.Rows.Count, "B").End(xlUp).Row + 1
    If r < 2 Then r = 2

    Application.ScreenUpdating = False
    ' No. はシートの数式 (G列に値が入った時のみ採番) で自動採番される想定
    wsL.Cells(r, 2).Value = wsF.Range(CELL_DATE).Value      ' 日付
    wsL.Cells(r, 3).Value = wsF.Range(CELL_TIME).Value      ' 開始時刻
    wsL.Cells(r, 4).Value = wsF.Range(CELL_DURATION).Value  ' 通話時間(分)
    wsL.Cells(r, 5).Value = wsF.Range(CELL_TYPE).Value      ' 種別
    wsL.Cells(r, 6).Value = wsF.Range(CELL_AREA).Value      ' エリア
    wsL.Cells(r, 7).Value = wsF.Range(CELL_COMPANY).Value   ' 企業名
    wsL.Cells(r, 8).Value = wsF.Range(CELL_INCHARGE).Value  ' 担当者(自社)
    wsL.Cells(r, 9).Value = wsF.Range(CELL_PARTNER).Value   ' 相手先担当者
    wsL.Cells(r, 10).Value = wsF.Range(CELL_RESULT).Value   ' 結果
    wsL.Cells(r, 11).Value = wsF.Range(CELL_MEMO).Value     ' 内容メモ
    wsL.Cells(r, 12).Value = wsF.Range(CELL_TODO).Value     ' 次回ToDo
    wsL.Cells(r, 13).Value = wsF.Range(CELL_NEXTDATE).Value ' 次回予定日

    ' 元シート (JA or 畜種農業) の該当企業に 加電回数++/最終加電日 を反映
    Call UpdateSourceSheet( _
        CStr(wsF.Range(CELL_TYPE).Value), _
        CStr(wsF.Range(CELL_COMPANY).Value), _
        CDate(wsF.Range(CELL_DATE).Value), _
        CStr(wsF.Range(CELL_RESULT).Value))

    Application.ScreenUpdating = True

    MsgBox "加電履歴 " & (r - 1) & " 件目として登録しました。", vbInformation, "登録完了"

    ' フォームをクリアして次の入力に備える (日付・時刻は前回値を残す)
    Call ClearKadenFormInternal(True)
End Sub

' ----------------------------------------------------------------------------
'  UpdateSourceSheet — 元リスト (JAリスト / 畜種農業) の該当企業行を更新
' ----------------------------------------------------------------------------
Private Sub UpdateSourceSheet(ByVal kind As String, ByVal company As String, _
                              ByVal callDate As Date, ByVal result As String)
    Dim sheetName As String, companyCol As Long
    If kind = "JA" Then
        sheetName = "JAリスト"
        companyCol = 2 ' エリアを A 列に追加したので 企業名 は B 列
    Else
        sheetName = "畜種農業"
        companyCol = 2 ' 元から エリア=A, 企業名=B
    End If

    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(sheetName)
    On Error GoTo 0
    If ws Is Nothing Then Exit Sub

    ' 企業名で検索
    Dim found As Range
    Set found = ws.Columns(companyCol).Find(What:=company, LookAt:=xlWhole, _
                                            MatchCase:=False)
    If found Is Nothing Then Exit Sub

    ' 加電回数列・最終加電日列・最終結果列 を ヘッダー名で特定
    Dim cntCol As Long, lastCol As Long, resCol As Long
    cntCol = FindHeaderCol(ws, "加電回数")
    lastCol = FindHeaderCol(ws, "最終加電日")
    resCol = FindHeaderCol(ws, "最終結果")

    If cntCol > 0 Then
        Dim cur As Variant
        cur = ws.Cells(found.Row, cntCol).Value
        If IsNumeric(cur) Then
            ws.Cells(found.Row, cntCol).Value = CLng(cur) + 1
        Else
            ws.Cells(found.Row, cntCol).Value = 1
        End If
    End If
    If lastCol > 0 Then
        ws.Cells(found.Row, lastCol).Value = callDate
        ws.Cells(found.Row, lastCol).NumberFormat = "yyyy/m/d"
    End If
    If resCol > 0 And Len(result) > 0 Then
        ws.Cells(found.Row, resCol).Value = result
    End If
End Sub

Private Function FindHeaderCol(ByVal ws As Worksheet, ByVal name As String) As Long
    Dim c As Long
    For c = 1 To ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
        If Trim$(CStr(ws.Cells(1, c).Value)) = name Then
            FindHeaderCol = c: Exit Function
        End If
    Next c
    FindHeaderCol = 0
End Function

' ----------------------------------------------------------------------------
'  ClearKadenForm — 「クリア」ボタンから呼び出す
' ----------------------------------------------------------------------------
Public Sub ClearKadenForm()
    Call ClearKadenFormInternal(False)
End Sub

Private Sub ClearKadenFormInternal(ByVal keepDateTime As Boolean)
    Dim wsF As Worksheet
    Set wsF = ThisWorkbook.Worksheets(FORM_SHEET)
    Application.ScreenUpdating = False
    If Not keepDateTime Then
        wsF.Range(CELL_DATE).ClearContents
        wsF.Range(CELL_TIME).ClearContents
    End If
    wsF.Range(CELL_DURATION).ClearContents
    wsF.Range(CELL_TYPE).ClearContents
    wsF.Range(CELL_AREA).ClearContents
    wsF.Range(CELL_COMPANY).ClearContents
    wsF.Range(CELL_INCHARGE).ClearContents
    wsF.Range(CELL_PARTNER).ClearContents
    wsF.Range(CELL_RESULT).ClearContents
    wsF.Range(CELL_MEMO).ClearContents
    wsF.Range(CELL_TODO).ClearContents
    wsF.Range(CELL_NEXTDATE).ClearContents
    wsF.Range(CELL_DATE).Select
    Application.ScreenUpdating = True
End Sub


Attribute VB_Name = "modDatePicker"
' ============================================================================
'  modDatePicker — シンプル自作カレンダーピッカー
'  外部コントロール(MSCAL.OCX等)に依存しないため 64-bit Excel でも動作。
'  使い方: ShowDatePicker(初期日) → 選択された日付 (キャンセル時は Empty)
'
'  仕組み: 一時シート "_picker" に 7×6 のカレンダーを描画し、シート上での
'  選択を待つ (Application.Wait + 状態フラグ)。本物のモーダルではないが
'  実用十分。
' ============================================================================
Option Explicit

Public g_PickerSelected As Variant
Public g_PickerYear As Long
Public g_PickerMonth As Long

Private Const PICKER_SHEET As String = "_picker"

' ----------------------------------------------------------------------------
'  公開: ShowDatePicker(初期日) → Variant (Date or Empty)
' ----------------------------------------------------------------------------
Public Function ShowDatePicker(Optional ByVal seedDate As Date = 0) As Variant
    Dim ws As Worksheet, prevSheet As Worksheet
    Set prevSheet = ActiveSheet

    If seedDate = 0 Then seedDate = Date
    g_PickerYear = Year(seedDate)
    g_PickerMonth = Month(seedDate)
    g_PickerSelected = Empty

    Set ws = EnsurePickerSheet()
    Call DrawCalendar(ws)
    ws.Visible = xlSheetVisible
    ws.Activate
    ws.Range("D8").Select  ' 中央付近を選択

    ' 選択完了またはキャンセルを待つ
    Do While IsEmpty(g_PickerSelected)
        DoEvents
        Application.Wait Now + TimeSerial(0, 0, 0) + (0.05 / 86400)
        If Not WorksheetIsActive(ws) Then
            ' ユーザーが他のシートをクリックした → キャンセル
            g_PickerSelected = "CANCEL"
            Exit Do
        End If
    Loop

    ws.Visible = xlSheetHidden
    On Error Resume Next
    prevSheet.Activate
    On Error GoTo 0

    If VarType(g_PickerSelected) = vbString And g_PickerSelected = "CANCEL" Then
        ShowDatePicker = Empty
    ElseIf IsDate(g_PickerSelected) Then
        ShowDatePicker = CDate(g_PickerSelected)
    Else
        ShowDatePicker = Empty
    End If
End Function

Private Function WorksheetIsActive(ByVal ws As Worksheet) As Boolean
    On Error Resume Next
    WorksheetIsActive = (ActiveSheet.Name = ws.Name)
End Function

Private Function EnsurePickerSheet() As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(PICKER_SHEET)
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:= _
                 ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = PICKER_SHEET
    End If
    ws.Visible = xlSheetHidden
    Set EnsurePickerSheet = ws
End Function

' ----------------------------------------------------------------------------
'  DrawCalendar — _picker シートに月カレンダーを描画
' ----------------------------------------------------------------------------
Private Sub DrawCalendar(ByVal ws As Worksheet)
    Application.ScreenUpdating = False
    ws.Cells.Clear
    ws.Cells.Interior.Pattern = xlNone
    ws.Cells.Borders.LineStyle = xlNone
    ws.Cells.Font.Bold = False
    ws.Cells.Font.Color = RGB(0, 0, 0)
    ws.DisplayPageBreaks = False

    ' レイアウト: B2:H2 = 月ナビ, B3:H3 = 曜日, B4:H9 = 日付グリッド
    Dim c As Long
    For c = 2 To 8
        ws.Columns(c).ColumnWidth = 6
    Next c
    Dim rr As Long
    For rr = 2 To 9
        ws.Rows(rr).RowHeight = 22
    Next rr

    ' 月ナビ
    ws.Range("B2").Value = "◀"
    ws.Range("B2").Interior.Color = RGB(220, 230, 241)
    ws.Range("B2").HorizontalAlignment = xlCenter
    ws.Range("B2").Font.Bold = True

    ws.Range("C2:G2").Merge
    ws.Range("C2").Value = Format(DateSerial(g_PickerYear, g_PickerMonth, 1), "yyyy年 m月")
    ws.Range("C2").Font.Bold = True
    ws.Range("C2").Font.Size = 12
    ws.Range("C2").HorizontalAlignment = xlCenter
    ws.Range("C2").Interior.Color = RGB(46, 117, 182)
    ws.Range("C2").Font.Color = RGB(255, 255, 255)

    ws.Range("H2").Value = "▶"
    ws.Range("H2").Interior.Color = RGB(220, 230, 241)
    ws.Range("H2").HorizontalAlignment = xlCenter
    ws.Range("H2").Font.Bold = True

    ' 曜日ヘッダー
    Dim wd As Variant, i As Long
    wd = Array("日", "月", "火", "水", "木", "金", "土")
    For i = 0 To 6
        With ws.Cells(3, 2 + i)
            .Value = wd(i)
            .Font.Bold = True
            .HorizontalAlignment = xlCenter
            .Interior.Color = RGB(240, 240, 240)
            If i = 0 Then .Font.Color = RGB(192, 0, 0)
            If i = 6 Then .Font.Color = RGB(0, 80, 192)
        End With
    Next i

    ' 日付グリッド
    Dim firstDay As Date, daysInMonth As Long, startWeekday As Long
    firstDay = DateSerial(g_PickerYear, g_PickerMonth, 1)
    daysInMonth = Day(DateSerial(g_PickerYear, g_PickerMonth + 1, 1) - 1)
    startWeekday = Weekday(firstDay, vbSunday) - 1  ' 0=日

    Dim d As Long, row As Long, col As Long
    For d = 1 To daysInMonth
        Dim idx As Long: idx = startWeekday + d - 1
        row = 4 + (idx \ 7)
        col = 2 + (idx Mod 7)
        With ws.Cells(row, col)
            .Value = d
            .HorizontalAlignment = xlCenter
            .Borders.LineStyle = xlContinuous
            .Borders.Color = RGB(200, 200, 200)
            If (idx Mod 7) = 0 Then .Font.Color = RGB(192, 0, 0)
            If (idx Mod 7) = 6 Then .Font.Color = RGB(0, 80, 192)
            ' 今日をハイライト
            If DateSerial(g_PickerYear, g_PickerMonth, d) = Date Then
                .Interior.Color = RGB(255, 235, 156)
                .Font.Bold = True
            End If
        End With
    Next d

    ws.Range("B10:H10").Merge
    ws.Range("B10").Value = "セルの日付をクリックで選択／月見出し ◀▶ で月送り／他シート移動でキャンセル"
    ws.Range("B10").Font.Size = 9
    ws.Range("B10").Font.Color = RGB(120, 120, 120)
    ws.Range("B10").HorizontalAlignment = xlCenter

    Application.ScreenUpdating = True
End Sub

' ----------------------------------------------------------------------------
'  Picker_SelectionChange — _picker シートで選択が変わるたびに呼ばれる
'  ThisWorkbook の Workbook_SheetSelectionChange からディスパッチ
' ----------------------------------------------------------------------------
Public Sub Picker_HandleSelect(ByVal Target As Range)
    If Target.Cells.CountLarge <> 1 Then Exit Sub
    Dim a As String: a = Target.Address
    If a = "$B$2" Then
        ' 前月
        g_PickerMonth = g_PickerMonth - 1
        If g_PickerMonth < 1 Then
            g_PickerMonth = 12
            g_PickerYear = g_PickerYear - 1
        End If
        Call DrawCalendar(Target.Worksheet)
        Target.Worksheet.Range("D8").Select
    ElseIf a = "$H$2" Then
        ' 翌月
        g_PickerMonth = g_PickerMonth + 1
        If g_PickerMonth > 12 Then
            g_PickerMonth = 1
            g_PickerYear = g_PickerYear + 1
        End If
        Call DrawCalendar(Target.Worksheet)
        Target.Worksheet.Range("D8").Select
    ElseIf Target.Row >= 4 And Target.Row <= 9 And _
           Target.Column >= 2 And Target.Column <= 8 Then
        If IsNumeric(Target.Value) And Len(Trim$(CStr(Target.Value))) > 0 Then
            Dim d As Long: d = CLng(Target.Value)
            If d >= 1 And d <= 31 Then
                g_PickerSelected = DateSerial(g_PickerYear, g_PickerMonth, d)
            End If
        End If
    End If
End Sub

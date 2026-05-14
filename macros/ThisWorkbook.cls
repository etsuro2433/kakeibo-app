VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "ThisWorkbook"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
' ============================================================================
'  ThisWorkbook — 全シート共通のダブルクリック→カレンダー処理
'  日付セルをダブルクリックすると簡易カレンダーが立ち上がり、日付選択で
'  そのセルに日付を入力します (32/64-bit 両対応の自作カレンダー)
' ============================================================================
Option Explicit

' どのセル(列)を日付セルとして扱うか:
'   ・加電履歴: B列(日付)、M列(次回予定日)
'   ・📝加電入力: C4 (日付), C15 (次回予定日)
'   ・JAリスト/畜種農業: ヘッダーに「日付」「予定日」を含む列すべて
Private Sub Workbook_SheetBeforeDoubleClick(ByVal Sh As Object, ByVal Target As Range, _
                                            Cancel As Boolean)
    On Error GoTo SafeExit
    If Target.Cells.CountLarge > 1 Then Exit Sub
    If Not IsDateCell(Sh, Target) Then Exit Sub

    Dim picked As Variant
    picked = ShowDatePicker(IIf(IsDate(Target.Value), CDate(Target.Value), Date))
    If IsDate(picked) Then
        Target.Value = CDate(picked)
        Target.NumberFormat = "yyyy/m/d"
        Cancel = True
    End If
    Exit Sub
SafeExit:
End Sub

' _picker シートでの選択をピッカーロジックに転送
Private Sub Workbook_SheetSelectionChange(ByVal Sh As Object, ByVal Target As Range)
    On Error Resume Next
    If Sh.Name = "_picker" Then
        Call Picker_HandleSelect(Target)
    End If
End Sub

Private Function IsDateCell(ByVal Sh As Object, ByVal r As Range) As Boolean
    Dim sn As String: sn = Sh.Name
    Select Case sn
        Case "加電履歴"
            IsDateCell = (r.Column = 2 Or r.Column = 13) And r.Row >= 2
        Case "📝加電入力"
            IsDateCell = (r.Address = "$C$4" Or r.Address = "$C$15")
        Case "JAリスト", "畜種農業"
            If r.Row >= 2 Then
                Dim hdr As String
                hdr = CStr(Sh.Cells(1, r.Column).Value)
                If InStr(hdr, "日付") > 0 Or InStr(hdr, "予定日") > 0 Then
                    IsDateCell = True
                End If
            End If
    End Select
End Function

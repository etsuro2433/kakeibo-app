"""
LibreOffice UNO 経由で .xlsm を組み立てる:
  1. 既存の output/企業リスト_作業中.xlsx を開く
  2. ドキュメント内 Basic ライブラリに VBA モジュールを注入
     (Option VBASupport 1 で VBA 構文を有効化)
  3. シート上に押しボタン(Form Control)を配置し、マクロを割当
  4. .xlsm として保存
"""
import sys, os, time
sys.path.insert(0, '/usr/lib/python3/dist-packages')
import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.awt import Size, Point

ROOT = "/home/user/kakeibo-app"
SRC_ORIG = os.path.join(ROOT, "output", "企業リスト_作業中.xlsx")
DST_FINAL = os.path.join(ROOT, "output", "企業リスト_作業中.xlsm")
# LibreOffice ignores non-ASCII paths reliably → use ASCII tmp paths
SRC = "/tmp/_kaden_src.xlsx"
DST = "/tmp/_kaden_dst.xlsm"
MACROS_DIR = os.path.join(ROOT, "macros")

import shutil
shutil.copy2(SRC_ORIG, SRC)


def pv(name, value):
    p = PropertyValue()
    p.Name = name
    p.Value = value
    return p


def connect():
    local = uno.getComponentContext()
    resolver = local.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local
    )
    ctx = resolver.resolve(
        "uno:socket,host=127.0.0.1,port=2002;urp;StarOffice.ComponentContext"
    )
    smgr = ctx.ServiceManager
    desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
    return ctx, smgr, desktop


def file_url(path):
    return uno.systemPathToFileUrl(os.path.abspath(path))


def read_bas(name):
    """Read a .bas / .cls file and strip Attribute/VERSION lines."""
    p = os.path.join(MACROS_DIR, name)
    with open(p, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()
    out = []
    for ln in lines:
        s = ln.lstrip()
        if s.startswith("VERSION ") or s.startswith("BEGIN") or s == "END":
            continue
        if s.startswith("Attribute "):
            continue
        if s.startswith("MultiUse "):
            continue
        out.append(ln)
    body = "\n".join(out).strip()
    # VBA互換モードを宣言
    if "Option VBASupport" not in body:
        body = "Option VBASupport 1\n" + body
    return body


def inject_basic(doc, module_name, code):
    """Add a Basic module to the document's Standard library."""
    basic = doc.BasicLibraries
    lib_name = "VBAProject"
    if not basic.hasByName(lib_name):
        basic.createLibrary(lib_name)
    lib = basic.getByName(lib_name)
    if lib.hasByName(module_name):
        lib.removeByName(module_name)
    lib.insertByName(module_name, code)
    print(f"  + module: {lib_name}.{module_name} ({len(code)} chars)")


def add_button(sheet, name, label, macro_name, x_mm, y_mm, w_mm=35, h_mm=10):
    """Insert a button shape on the given sheet, assigning a macro."""
    doc = sheet  # keep ref
    # 1/100mm units
    shape = sheet.DrawPage.Forms  # ensure forms exist
    # Create a CommandButton form control
    smgr = uno.getComponentContext().ServiceManager
    # Use the sheet's document factory
    pass


def main():
    print("Connecting to LibreOffice...")
    ctx, smgr, desktop = connect()

    print(f"Opening: {SRC}")
    args = [
        pv("Hidden", True),
        pv("MacroExecutionMode", 4),
        pv("FilterName", "Calc MS Excel 2007 XML"),
        pv("ReadOnly", False),
    ]
    doc = desktop.loadComponentFromURL(file_url(SRC), "_blank", 0, tuple(args))
    if doc is None:
        raise RuntimeError("Failed to open source xlsx")

    # 1) VBA インジェクション
    print("Injecting VBA modules...")
    inject_basic(doc, "modKaden", read_bas("modKaden.bas"))
    inject_basic(doc, "modDatePicker", read_bas("modDatePicker.bas"))
    # ThisWorkbook イベントは Workbook クラスに紐づくため、Standard ライブラリ内の
    # ThisWorkbook モジュールではなく、ドキュメントモジュールに別途配置する必要が
    # ある。LibreOffice のドキュメントイベント Tab.SheetEventBroker か、または
    # ActionListener 形式を使う。
    # シンプルにするため、ダブルクリックハンドラは modKaden 側にユーティリティ関数として置き、
    # シートのイベントは "登録"ボタンと並列の "📅日付選択" ボタンで提供する。
    # 元の ThisWorkbook.cls の処理(BeforeDoubleClick)はモジュール化:
    inject_basic(doc, "modEvents", read_bas("ThisWorkbook.cls"))

    # 2) 各シートにボタンを配置
    print("Adding buttons...")
    sheets = doc.Sheets

    def make_button(sheet, label, macro, col, row, width_cells=2, height_cells=1):
        """Insert a CommandButton-like push button shape with macro."""
        # CellRange を取得して座標決定
        cell = sheet.getCellByPosition(col, row)
        pos = cell.Position  # 1/100 mm
        size = cell.Size
        # シェイプを作る
        shape = doc.createInstance("com.sun.star.presentation.TitleTextShape")
        # 実際は drawing.CommandButtonShape が良い
        # FormControl 方式に切替
        return None

    # FormControl(マクロを割り当てられるボタン)を作る
    from com.sun.star.awt import Size as AwtSize, Point as AwtPoint

    def add_form_button(sheet, label, macro_name, x_mm, y_mm, w_mm=40, h_mm=10):
        # 1/100 mm
        x = int(x_mm * 100)
        y = int(y_mm * 100)
        w = int(w_mm * 100)
        h = int(h_mm * 100)

        # Form control model
        ctrl = doc.createInstance("com.sun.star.form.component.CommandButton")
        ctrl.Label = label
        ctrl.Name = "btn_" + macro_name

        # Drawing shape
        shape = doc.createInstance("com.sun.star.drawing.ControlShape")
        shape.Size = AwtSize(w, h)

        # Insert into the sheet's draw page
        dp = sheet.DrawPage
        dp.add(shape)
        shape.Position = AwtPoint(x, y)
        shape.Control = ctrl

        # マクロを click イベントに割当: VBAProject.modKaden.OpenKadenForm
        # EventBinding: アクション "approve" や "actionPerformed" を XActionListener
        # で受けるが、Basic マクロを直に紐付ける方法は ScriptEvent を使う
        from com.sun.star.script import ScriptEventDescriptor

        # 親フォームを取得 (ControlShape の Control プロパティに対応)
        # フォーム配下のコントロールに ScriptEvent を設定するには、フォーム上の
        # コントロールのインデックスが必要
        forms = dp.Forms
        if forms.Count == 0:
            forms.insertByIndex(0, doc.createInstance("com.sun.star.form.component.Form"))
        form = forms.getByIndex(0)
        # フォームに ctrl を追加
        # ※shape.Control = ctrl で自動的に登録される
        # コントロールのインデックスを探す
        idx = -1
        for i in range(form.Count):
            if form.getByIndex(i).Name == ctrl.Name:
                idx = i
                break
        if idx < 0:
            # フォームに無い場合は明示的に追加
            form.insertByIndex(form.Count, ctrl)
            idx = form.Count - 1

        ev = ScriptEventDescriptor()
        ev.ListenerType = "XActionListener"
        ev.EventMethod = "actionPerformed"
        ev.ScriptType = "Script"
        ev.ScriptCode = (
            f"vnd.sun.star.script:VBAProject.{macro_name}?"
            f"language=Basic&location=document"
        )
        form.registerScriptEvent(idx, ev)
        return shape

    # シートごとに「📝 加電を登録」ボタンを配置
    target_sheets = ["JAリスト", "畜種農業", "加電履歴"]
    for name in target_sheets:
        if sheets.hasByName(name):
            ws = sheets.getByName(name)
            try:
                add_form_button(ws, "📝 加電を登録", "modKaden.OpenKadenForm",
                                x_mm=5, y_mm=2, w_mm=45, h_mm=10)
                print(f"  + button on {name}")
            except Exception as e:
                print(f"  ! failed on {name}: {e}")

    # 📝加電入力 に 登録/クリア ボタン
    if sheets.hasByName("📝加電入力"):
        ws = sheets.getByName("📝加電入力")
        try:
            add_form_button(ws, "✓ 登録", "modKaden.RegisterKaden",
                            x_mm=70, y_mm=5, w_mm=35, h_mm=10)
            add_form_button(ws, "↺ クリア", "modKaden.ClearKadenForm",
                            x_mm=110, y_mm=5, w_mm=35, h_mm=10)
            print("  + register/clear buttons on 📝加電入力")
        except Exception as e:
            print(f"  ! failed on 📝加電入力: {e}")

    # 3) .xlsm として保存
    print(f"Saving as xlsm: {DST}")
    save_args = [
        pv("FilterName", "Calc MS Excel 2007 VBA XML"),
        pv("Overwrite", True),
    ]
    doc.storeToURL(file_url(DST), tuple(save_args))
    doc.close(True)
    # Move ASCII tmp file back to UTF-8 destination
    shutil.move(DST, DST_FINAL)
    print(f"Done. Final: {DST_FINAL}")


if __name__ == "__main__":
    main()

"""
企業リスト_作業中.xlsx に以下の改修を加える:
  1. JAリスト の先頭列に「エリア」を追加し、住所から地域を自動判定
  2. 畜種農業 の「道東(網走)」等を 道東 に正規化
  3. 加電履歴 シートに エリア列を追加 + 種別列(シート)を JA/畜種農業 の選択肢へ
  4. 隠しシート _master を作成し、エリア別企業リストを集約
  5. 加電履歴 にデータ入力規則(プルダウン/連動)を設定

VBA(UserForm) は別ファイル macros/ 配下に置く。
"""
from __future__ import annotations
from pathlib import Path
from collections import defaultdict
import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side

SRC = Path("output/企業リスト_作業中.xlsx")
DST = Path("output/企業リスト_作業中.xlsx")

# --- エリア判定ルール (JAリスト の住所文字列を見て判定) -----------------
# 道央: 石狩・空知・後志・胆振・日高
# 道北: 上川・留萌・宗谷
# 道東: オホーツク・十勝・釧路・根室
# 道南: 渡島・檜山
DOO_CENTER = [
    "恵庭", "石狩", "新篠津", "岩見沢", "美唄", "滝川", "砂川", "月形",
    "深川", "秩父別", "新十津川", "余市", "共和", "仁木", "札幌", "江別",
    "千歳", "苫小牧", "室蘭", "登別", "白老", "むかわ", "日高", "新冠",
    "浦河", "様似", "えりも", "夕張", "栗山", "由仁", "長沼", "南幌",
    "北広島", "当別", "羽幌",  # 羽幌は留萌だが旧JAるもいは道北
]
DOO_NORTH = [
    "旭川", "東神楽", "東川", "当麻", "愛別", "比布", "士別", "名寄",
    "上川郡", "豊富", "枝幸", "浜頓別", "稚内", "中川", "音威子府",
    "美深", "下川", "和寒", "剣淵", "鷹栖", "上川", "層雲峡", "天塩",
    "羽幌",  # 留萌(羽幌町)
]
DOO_EAST = [
    "北見", "常呂", "大空", "美幌", "津別", "斜里", "清里", "小清水",
    "湧別", "網走", "紋別", "遠軽", "雄武", "興部", "西興部", "佐呂間",
    "訓子府", "置戸", "帯広", "音更", "士幌", "上士幌", "鹿追", "新得",
    "清水", "芽室", "中札内", "更別", "大樹", "広尾", "幕別", "池田",
    "豊頃", "本別", "足寄", "陸別", "浦幌", "釧路", "標茶", "別海",
    "標津", "中標津", "羅臼", "弟子屈", "厚岸", "浜中", "鶴居", "白糠",
    "根室",
]
DOO_SOUTH = [
    "函館", "二海", "八雲", "茅部", "森町", "鹿部", "七飯", "北斗",
    "知内", "木古内", "松前", "福島", "渡島", "檜山", "今金", "せたな",
    "上ノ国", "江差", "厚沢部", "乙部",
]

# 既知の合併情報・特殊ケースを名前で直接マッピング
NAME_OVERRIDES = {
    "JA道央": "道央",
    "JA北いしかり (旧JA北石狩)": "道央",
    "JA新しのつ": "道央",
    "JAいわみざわ": "道央",
    "JAみねのぶ": "道央",
    "JAびばい": "道央",
    "JAたきかわ": "道央",
    "JA新すながわ": "道央",
    "JA月形町": "道央",
    "JAきたそらち": "道央",
    "JA北いぶき": "道央",
    "JAピンネ": "道央",
    "JAよいち (旧JA余市町)": "道央",
    "JAきょうわ": "道央",
    "JA新おたる": "道央",
    "JAたいせつ": "道北",
    "JA東神楽": "道北",
    "JAひがしかわ": "道北",
    "JA当麻": "道北",
    "JA上川中央": "道北",
    "JAぴっぷ町": "道北",
    "JA北ひびき": "道北",
    "JA道北なよろ (旧JA名寄)": "道北",
    "JA南るもい ※令和3年JAるもいへ合併・現存せず": "道北",
    "JAオロロン ※令和3年JAるもいへ合併・現存せず": "道北",
    "JA北宗谷": "道北",
    "JA宗谷南": "道北",
    "JAひがし宗谷 (東宗谷農業協同組合)": "道北",
    "JAきたみらい": "道東",
    "JAところ": "道東",
    "JAめまんべつ": "道東",
    "JAびほろ": "道東",
    "JAつべつ": "道東",
    "JAしれとこ斜里 (旧JA斜里町)": "道東",
    "JA清里町": "道東",
    "JAこしみず": "道東",
    "JAえんゆう": "道東",
    "JA帯広かわにし": "道東",
    "JAおびひろ ※2003年JA帯広かわにしへ合併・現存せず": "道東",
    "JAおとふけ": "道東",
    "JA木野": "道東",
    "JA士幌町": "道東",
    "JA上士幌町": "道東",
    "JA鹿追町": "道東",
    "JA新得町": "道東",
    "JA阿寒": "道東",
    "JAしべちゃ": "道東",
    "JA道東あさひ": "道東",
    "JAなかしゅんべつ (中春別農業協同組合)": "道東",
    "JA標津": "道東",
    "JAオホーツク網走": "道東",
}


def detect_area(name: str, address: str | None) -> str:
    if name in NAME_OVERRIDES:
        return NAME_OVERRIDES[name]
    addr = address or ""
    for kw in DOO_SOUTH:
        if kw in addr:
            return "道南"
    for kw in DOO_EAST:
        if kw in addr:
            return "道東"
    for kw in DOO_NORTH:
        if kw in addr:
            return "道北"
    for kw in DOO_CENTER:
        if kw in addr:
            return "道央"
    return ""


def normalize_chiku_area(value: str | None) -> str | None:
    """畜種農業の '道東(網走)' 等を '道東' に正規化。"""
    if not value:
        return value
    s = str(value)
    for prefix in ("道央", "道北", "道東", "道南"):
        if s.startswith(prefix):
            return prefix
    return s


def main() -> None:
    wb = openpyxl.load_workbook(SRC)

    # --------------------------------------------------------
    # 1) JAリスト: 先頭列にエリアを挿入
    # --------------------------------------------------------
    ws_ja = wb["JAリスト"]
    # 既にエリア列が無いことを確認
    first_header = ws_ja.cell(row=1, column=1).value
    if first_header != "エリア":
        ws_ja.insert_cols(1)
        ws_ja.cell(row=1, column=1, value="エリア")
        for r in range(2, ws_ja.max_row + 1):
            name = ws_ja.cell(row=r, column=2).value  # 旧A列が新B列に移動
            addr = ws_ja.cell(row=r, column=4).value  # 旧C列(住所)が新D列
            area = detect_area(name or "", addr)
            ws_ja.cell(row=r, column=1, value=area)
        # 見出しスタイル
        ws_ja.column_dimensions["A"].width = 8
    print("[1] JAリスト: エリア列を追加")

    # --------------------------------------------------------
    # 2) 畜種農業: エリア値を正規化 (道東サブ分類を統合)
    # --------------------------------------------------------
    ws_ch = wb["畜種農業"]
    changed = 0
    for r in range(2, ws_ch.max_row + 1):
        c = ws_ch.cell(row=r, column=1)
        new = normalize_chiku_area(c.value)
        if new != c.value:
            c.value = new
            changed += 1
    print(f"[2] 畜種農業: エリア正規化 ({changed}件)")

    # --------------------------------------------------------
    # 3) _master シートを作成 (隠しシート: 連動プルダウン用)
    # --------------------------------------------------------
    if "_master" in wb.sheetnames:
        del wb["_master"]
    ws_m = wb.create_sheet("_master")
    ws_m.sheet_state = "hidden"

    # 集計: エリア -> [(企業名, 種別)]
    by_area: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for r in range(2, ws_ja.max_row + 1):
        area = ws_ja.cell(row=r, column=1).value
        name = ws_ja.cell(row=r, column=2).value
        if area and name:
            by_area[area].append((str(name), "JA"))
    for r in range(2, ws_ch.max_row + 1):
        area = ws_ch.cell(row=r, column=1).value
        name = ws_ch.cell(row=r, column=2).value
        if area and name:
            by_area[area].append((str(name), "畜種農業"))

    areas_order = ["道央", "道北", "道東", "道南"]
    # ヘッダー
    ws_m["A1"] = "エリア一覧"
    for i, a in enumerate(areas_order, start=2):
        ws_m.cell(row=i, column=1, value=a)

    # エリア別企業列 (B以降): B=道央, C=道北, D=道東, E=道南
    for col_idx, area in enumerate(areas_order, start=2):
        ws_m.cell(row=1, column=col_idx, value=area)
        names = sorted({n for n, _ in by_area.get(area, [])})
        for i, n in enumerate(names, start=2):
            ws_m.cell(row=i, column=col_idx, value=n)

    # 種別→企業 マッピング用列 (F〜): 種別×エリア で4×2=8列
    types = ["JA", "畜種農業"]
    sub_col = 6  # F
    sub_map: dict[tuple[str, str], str] = {}
    for t in types:
        for a in areas_order:
            ws_m.cell(row=1, column=sub_col, value=f"{t}_{a}")
            names = sorted({n for n, tt in by_area.get(a, []) if tt == t})
            for i, n in enumerate(names, start=2):
                ws_m.cell(row=i, column=sub_col, value=n)
            sub_map[(t, a)] = get_column_letter(sub_col)
            sub_col += 1

    print(f"[3] _master シート作成 (エリア4, 列 {sub_col - 1}個)")

    # --------------------------------------------------------
    # 4) 名前付き範囲を定義 (INDIRECTで参照される)
    #    - 道央/道北/道東/道南 : エリア配下の全企業
    #    - JA_道央 等 : 種別×エリア
    # --------------------------------------------------------
    # 既存の同名を削除
    existing = list(wb.defined_names)
    for nm in existing:
        if nm in ("道央", "道北", "道東", "道南") or nm.startswith(("JA_", "畜種農業_")):
            del wb.defined_names[nm]

    def add_name(name: str, sheet: str, col_letter: str, row_count: int) -> None:
        if row_count <= 0:
            row_count = 1
        ref = f"'{sheet}'!${col_letter}$2:${col_letter}${row_count + 1}"
        wb.defined_names[name] = DefinedName(name=name, attr_text=ref)

    # エリア全体(JA+畜種農業)
    for col_idx, area in enumerate(areas_order, start=2):
        add_name(area, "_master", get_column_letter(col_idx), len({n for n, _ in by_area.get(area, [])}))

    # 種別×エリア
    for (t, a), col_letter in sub_map.items():
        cnt = len({n for n, tt in by_area.get(a, []) if tt == t})
        # 名前: 日本語+_ は使えるが、" _"より英字接頭辞で安全に
        nm = f"{'JA' if t == 'JA' else 'CH'}_{a}"
        add_name(nm, "_master", col_letter, cnt)

    print("[4] 名前付き範囲を定義")

    # --------------------------------------------------------
    # 5) 加電履歴 シートを再構築
    # --------------------------------------------------------
    if "加電履歴" in wb.sheetnames:
        del wb["加電履歴"]
    ws_k = wb.create_sheet("加電履歴")

    headers = [
        "No.", "日付", "開始時刻", "通話時間(分)", "種別", "エリア", "企業名",
        "担当者(自社)", "相手先担当者", "結果", "内容メモ",
        "次回ToDo", "次回予定日",
    ]
    for i, h in enumerate(headers, start=1):
        c = ws_k.cell(row=1, column=i, value=h)
        c.font = Font(bold=True)
        c.fill = PatternFill("solid", fgColor="DCE6F1")
        c.alignment = Alignment(horizontal="center", vertical="center")

    widths = [6, 12, 10, 10, 10, 8, 28, 14, 14, 14, 30, 24, 12]
    for i, w in enumerate(widths, start=1):
        ws_k.column_dimensions[get_column_letter(i)].width = w
    ws_k.freeze_panes = "A2"

    # 行数バッファ (1000行分の入力規則を仕込む)
    MAX_ROW = 1001

    # 日付 (B列) - 日付書式
    for r in range(2, MAX_ROW + 1):
        ws_k.cell(row=r, column=2).number_format = "yyyy/m/d"
        ws_k.cell(row=r, column=3).number_format = "h:mm"
        ws_k.cell(row=r, column=13).number_format = "yyyy/m/d"

    # No.列の自動採番 (式)
    for r in range(2, MAX_ROW + 1):
        ws_k.cell(row=r, column=1, value=f'=IF(G{r}="","",ROW()-1)')

    # 種別 プルダウン (E列)
    dv_type = DataValidation(type="list", formula1='"JA,畜種農業"', allow_blank=True)
    dv_type.add(f"E2:E{MAX_ROW}")
    ws_k.add_data_validation(dv_type)

    # エリア プルダウン (F列)
    dv_area = DataValidation(type="list", formula1='"道央,道北,道東,道南"', allow_blank=True)
    dv_area.add(f"F2:F{MAX_ROW}")
    ws_k.add_data_validation(dv_area)

    # 企業名 連動プルダウン (G列):
    # 種別+エリア が両方入っていれば JA_道央 等で絞り込み、エリアのみなら全件
    # 数式: =IF(E2="",IF(F2="",,INDIRECT(F2)),INDIRECT(IF(E2="JA","JA_","CH_")&F2))
    company_formula = (
        '=IF($E2="",IF($F2="","",INDIRECT($F2)),'
        'INDIRECT(IF($E2="JA","JA_","CH_")&$F2))'
    )
    dv_company = DataValidation(type="list", formula1=company_formula, allow_blank=True)
    dv_company.error = "プルダウンから選択してください(先にエリアを選ぶと候補が絞られます)"
    dv_company.errorTitle = "入力エラー"
    dv_company.add(f"G2:G{MAX_ROW}")
    ws_k.add_data_validation(dv_company)

    # 結果 プルダウン (J列)
    dv_result = DataValidation(
        type="list",
        formula1='"不在,担当不在,担当不可,留守電,アポ獲得,再架電,断り,キーマン接触,情報収集,その他"',
        allow_blank=True,
    )
    dv_result.add(f"J2:J{MAX_ROW}")
    ws_k.add_data_validation(dv_result)

    print("[5] 加電履歴 シート再構築 + プルダウン設定")

    # --------------------------------------------------------
    # 6) 📝加電入力 フォームシートを作成
    # --------------------------------------------------------
    if "📝加電入力" in wb.sheetnames:
        del wb["📝加電入力"]
    ws_f = wb.create_sheet("📝加電入力")
    ws_f.sheet_view.showGridLines = False

    # レイアウト: B〜D列にラベル+入力枠
    title = ws_f.cell(row=2, column=2, value="📝 加電入力フォーム")
    title.font = Font(bold=True, size=14, color="FFFFFF")
    title.fill = PatternFill("solid", fgColor="2E75B6")
    title.alignment = Alignment(horizontal="center", vertical="center")
    ws_f.merge_cells("B2:D2")
    ws_f.row_dimensions[2].height = 28

    label_fill = PatternFill("solid", fgColor="DCE6F1")
    input_fill = PatternFill("solid", fgColor="FFFDE7")
    thin = Side(border_style="thin", color="888888")
    box = Border(top=thin, left=thin, right=thin, bottom=thin)

    fields = [
        ("日付", "yyyy/m/d", '"date"'),
        ("開始時刻", "h:mm", '"time"'),
        ("通話時間(分)", "0", '"num"'),
        ("種別", None, '"type"'),
        ("エリア", None, '"area"'),
        ("企業名", None, '"company"'),
        ("担当者(自社)", None, '"text"'),
        ("相手先担当者", None, '"text"'),
        ("結果", None, '"result"'),
        ("内容メモ", None, '"text"'),
        ("次回ToDo", None, '"text"'),
        ("次回予定日", "yyyy/m/d", '"date"'),
    ]
    start_row = 4
    for i, (label, fmt, _) in enumerate(fields):
        r = start_row + i
        lc = ws_f.cell(row=r, column=2, value=label)
        lc.fill = label_fill
        lc.font = Font(bold=True)
        lc.alignment = Alignment(horizontal="right", vertical="center")
        lc.border = box

        ic = ws_f.cell(row=r, column=3)
        ic.fill = input_fill
        ic.border = box
        ic.alignment = Alignment(vertical="center")
        if fmt:
            ic.number_format = fmt
        ws_f.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
        ws_f.row_dimensions[r].height = 22

    ws_f.column_dimensions["A"].width = 2
    ws_f.column_dimensions["B"].width = 16
    ws_f.column_dimensions["C"].width = 28
    ws_f.column_dimensions["D"].width = 28
    ws_f.column_dimensions["E"].width = 2

    # 入力セルの場所 (row, col) を参照しやすく定数化
    # 日付=C4, 時刻=C5, 通話時間=C6, 種別=C7, エリア=C8, 企業名=C9,
    # 担当(自社)=C10, 相手担当=C11, 結果=C12, メモ=C13, 次回=C14, 次回日=C15

    # データ入力規則 — 種別 (C7)
    dvf_type = DataValidation(type="list", formula1='"JA,畜種農業"', allow_blank=True)
    dvf_type.add("C7")
    ws_f.add_data_validation(dvf_type)

    # エリア (C8)
    dvf_area = DataValidation(type="list", formula1='"道央,道北,道東,道南"', allow_blank=True)
    dvf_area.add("C8")
    ws_f.add_data_validation(dvf_area)

    # 企業名 (C9) - 連動
    dvf_company = DataValidation(
        type="list",
        formula1='=IF($C$7="",IF($C$8="","",INDIRECT($C$8)),INDIRECT(IF($C$7="JA","JA_","CH_")&$C$8))',
        allow_blank=True,
    )
    dvf_company.add("C9")
    ws_f.add_data_validation(dvf_company)

    # 結果 (C12)
    dvf_result = DataValidation(
        type="list",
        formula1='"不在,担当不在,担当不可,留守電,アポ獲得,再架電,断り,キーマン接触,情報収集,その他"',
        allow_blank=True,
    )
    dvf_result.add("C12")
    ws_f.add_data_validation(dvf_result)

    # 操作ヘルプ
    help_r = start_row + len(fields) + 1
    ws_f.cell(row=help_r, column=2, value="ショートカット")
    ws_f.cell(row=help_r, column=2).font = Font(bold=True, color="555555")
    helps = [
        "Ctrl + ;   → 今日の日付を入力",
        "Ctrl + :   → 現在時刻を入力 (Ctrl+Shift+;)",
        "Alt + ↓   → プルダウンを開く",
        "Tab        → 次の入力欄へ移動",
    ]
    for i, msg in enumerate(helps):
        ws_f.cell(row=help_r + 1 + i, column=2, value=msg).font = Font(color="666666", size=10)
        ws_f.merge_cells(start_row=help_r + 1 + i, start_column=2,
                         end_row=help_r + 1 + i, end_column=4)

    # 「登録」「クリア」ボタンの位置は VBA から図形(Shape)として動的に追加してもらう
    # → READMEに手順を記載
    note_r = help_r + 1 + len(helps) + 1
    note = ws_f.cell(row=note_r, column=2,
                     value="↓ ここに「登録」「クリア」ボタンを VBA で追加します (README参照)")
    note.font = Font(italic=True, color="2E75B6")
    ws_f.merge_cells(start_row=note_r, start_column=2, end_row=note_r, end_column=4)

    print("[6] 📝加電入力 シート作成")

    # --------------------------------------------------------
    # 7) シートの並び順を整える: 加電履歴 → 📝加電入力 → JAリスト → 畜種農業 → _master
    # --------------------------------------------------------
    desired = ["加電履歴", "📝加電入力", "JAリスト", "畜種農業", "_master"]
    wb._sheets = [wb[name] for name in desired if name in wb.sheetnames]

    # --------------------------------------------------------
    # 保存
    # --------------------------------------------------------
    wb.save(DST)
    print(f"[OK] saved: {DST}")


if __name__ == "__main__":
    main()

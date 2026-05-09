# 家計簿アプリ

シンプルでクリーンな家計簿・収支管理アプリです。Next.js (App Router) + TypeScript + Tailwind CSS で構築され、データはブラウザの LocalStorage に保存されるためサーバー不要で動作します。

## 主な機能

- **収入・支出の記録** — 日付、金額、カテゴリ、支払い方法、メモを記録
- **固定費 / 変動費** — 支出ごとに費目を区別
- **家族用クレジットカード履歴** — カードごとに月次利用額を集計、登録カードは複数管理可能
- **月次サマリー & グラフ** — 円グラフ (カテゴリ別支出) と棒グラフ (直近6ヶ月の収支)
- **予算設定 & 超過アラート** — カテゴリごとに月次予算を設定し、進捗バーで可視化、80% 超で警告、超過で赤バッジ表示
- **CSV エクスポート / インポート** — 他アプリへの移行・バックアップに利用可能 (UTF-8 + BOM)
- **シンプルな日本語 UI** — 白基調・円表示・キーボード操作対応

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## ビルド

```bash
npm run build
npm start
```

## ページ構成

| パス | 内容 |
| --- | --- |
| `/` | ダッシュボード (月次サマリー、グラフ、予算進捗) |
| `/transactions` | 取引一覧 / 追加 / 編集 / 削除、フィルタ (全て / 支出 / 収入 / 固定費 / 変動費 / クレカ) |
| `/cards` | クレジットカード別利用額、固定費・変動費の一覧 |
| `/budgets` | カテゴリ別の月次予算設定と進捗 |
| `/settings` | カテゴリ管理、カード登録、CSV 入出力、データリセット |

## データ保存

すべてのデータは `localStorage` のキー `kakeibo:data:v1` に JSON で保存されます。
ブラウザを変えると別のデータになります。バックアップは設定ページから CSV でエクスポートしてください。

## CSV フォーマット

ヘッダー:

```
date,type,amount,category,costType,paymentMethod,cardName,memo
```

- `date`: `YYYY-MM-DD`
- `type`: `income` または `expense`
- `amount`: 数値
- `category`: カテゴリ名 (存在しない場合は自動作成)
- `costType`: `fixed` または `variable` (支出のみ)
- `paymentMethod`: `cash` / `bank` / `credit_card` / `e_money`
- `cardName`: クレジットカード名 (任意)
- `memo`: 任意

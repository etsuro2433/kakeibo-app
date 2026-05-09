"use client";

import { useRef, useState } from "react";
import { useData } from "@/components/DataProvider";
import { exportCSV, importCSV } from "@/lib/csv";
import { INITIAL_DATA } from "@/lib/defaults";
import { setHouseholdId } from "@/lib/household";
import { Category, TransactionType } from "@/lib/types";

const PALETTE = [
  "#f97316", "#84cc16", "#0ea5e9", "#06b6d4", "#6366f1",
  "#a855f7", "#ec4899", "#14b8a6", "#f59e0b", "#64748b",
  "#10b981", "#22c55e", "#7c3aed", "#94a3b8",
];

export default function SettingsPage() {
  const {
    data,
    cloudEnabled,
    householdId,
    addCategory,
    updateCategory,
    deleteCategory,
    addCard,
    removeCard,
    replaceAll,
    bulkAddTransactions,
  } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [newCat, setNewCat] = useState({ name: "", type: "expense" as TransactionType, color: PALETTE[0] });
  const [newCard, setNewCard] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  function copyHouseholdId() {
    navigator.clipboard.writeText(householdId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function joinHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    if (!confirm("世帯コードを変更するとこのデバイスのデータが切り替わります。続けますか?")) return;
    setHouseholdId(joinCode.trim());
    window.location.reload();
  }

  function downloadCSV() {
    const csv = exportCSV(data.transactions, data.categories);
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kakeibo_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(file: File) {
    const text = await file.text();
    const result = importCSV(text, data.categories);
    bulkAddTransactions(result.added, result.newCategories);
    setImportMsg(
      `${result.added.length} 件を取り込みました${
        result.newCategories.length ? ` (新規カテゴリ ${result.newCategories.length})` : ""
      }${result.skipped ? `, ${result.skipped} 件スキップ` : ""}`
    );
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    addCategory({ name: newCat.name.trim(), type: newCat.type, color: newCat.color });
    setNewCat({ name: "", type: newCat.type, color: PALETTE[0] });
  }

  function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newCard.trim()) return;
    addCard(newCard.trim());
    setNewCard("");
  }

  function reset() {
    if (confirm("すべてのデータを削除して初期状態に戻しますか?")) {
      replaceAll(INITIAL_DATA);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">設定</h1>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold">カテゴリ</h2>
        <ul className="divide-y divide-slate-100">
          {data.categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              onUpdate={(patch) => updateCategory(c.id, patch)}
              onDelete={() => {
                if (confirm(`カテゴリ「${c.name}」を削除しますか? (関連する予算も削除されます)`)) {
                  deleteCategory(c.id);
                }
              }}
            />
          ))}
        </ul>
        <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
          <select
            className="input"
            value={newCat.type}
            onChange={(e) => setNewCat({ ...newCat, type: e.target.value as TransactionType })}
          >
            <option value="expense">支出</option>
            <option value="income">収入</option>
          </select>
          <input
            className="input sm:col-span-2"
            placeholder="新しいカテゴリ名"
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newCat.color}
              onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
              className="h-9 w-9 rounded border border-slate-200"
            />
            <button className="btn-primary flex-1" type="submit">追加</button>
          </div>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold">家族用クレジットカード</h2>
        <ul className="space-y-1">
          {data.cards.map((c) => (
            <li key={c} className="flex items-center justify-between text-sm">
              <span>{c}</span>
              <button
                onClick={() => removeCard(c)}
                className="text-xs text-slate-400 hover:text-rose-600"
              >
                削除
              </button>
            </li>
          ))}
          {data.cards.length === 0 && (
            <li className="text-xs text-slate-400">登録されたカードはありません</li>
          )}
        </ul>
        <form onSubmit={handleAddCard} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="例: 楽天カード(本人)"
            value={newCard}
            onChange={(e) => setNewCard(e.target.value)}
          />
          <button type="submit" className="btn-primary">追加</button>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold">CSV エクスポート / インポート</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadCSV} className="btn-secondary">
            CSV をダウンロード
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-secondary">
            CSV をインポート
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
            }}
          />
        </div>
        {importMsg && <div className="text-xs text-emerald-600">{importMsg}</div>}
        <p className="text-xs text-slate-400">
          ヘッダー: date,type,amount,category,costType,paymentMethod,cardName,memo
          (type は income/expense, costType は fixed/variable, paymentMethod は cash/bank/credit_card/e_money)
        </p>
      </section>

      {cloudEnabled && (
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold">家族共有 — 世帯コード</h2>
          <p className="text-xs text-slate-500">
            このコードを家族に伝えると、同じデータをリアルタイムで共有できます。
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 break-all select-all">
              {householdId}
            </code>
            <button onClick={copyHouseholdId} className="btn-secondary shrink-0">
              {copied ? "✓ コピー済" : "コピー"}
            </button>
          </div>
          <div className="pt-1">
            <p className="text-xs font-medium text-slate-600 mb-1">
              家族の世帯コードに参加する
            </p>
            <form onSubmit={joinHousehold} className="flex gap-2">
              <input
                className="input flex-1 font-mono text-xs"
                placeholder="家族から受け取ったコードを貼り付け"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button type="submit" className="btn-primary shrink-0">切り替え</button>
            </form>
          </div>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold">データのリセット</h2>
        <p className="text-xs text-slate-500">
          このブラウザに保存された全ての取引・予算・カテゴリ・カード情報を削除します。
        </p>
        <button onClick={reset} className="btn-danger">すべてのデータを削除</button>
      </section>
    </div>
  );
}

function CategoryRow({
  category,
  onUpdate,
  onDelete,
}: {
  category: Category;
  onUpdate: (patch: Partial<Category>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(category.name);
  return (
    <li className="py-2 flex items-center gap-2">
      <input
        type="color"
        value={category.color}
        onChange={(e) => onUpdate({ color: e.target.value })}
        className="h-8 w-8 rounded border border-slate-200 shrink-0"
      />
      <input
        className="input flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== category.name) onUpdate({ name: name.trim() });
          else setName(category.name);
        }}
      />
      <span
        className={`badge ${
          category.type === "expense"
            ? "bg-rose-50 text-rose-600"
            : "bg-emerald-50 text-emerald-600"
        }`}
      >
        {category.type === "expense" ? "支出" : "収入"}
      </span>
      <button
        onClick={onDelete}
        className="text-xs text-slate-400 hover:text-rose-600 px-2"
      >
        削除
      </button>
    </li>
  );
}

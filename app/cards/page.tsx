"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import MonthSwitcher from "@/components/MonthSwitcher";
import TransactionList from "@/components/TransactionList";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/TransactionForm";
import { currentMonth, formatYen, monthOf } from "@/lib/utils";
import { Transaction } from "@/lib/types";

type Tab = "cards" | "fixed" | "variable";

export default function CardsPage() {
  const { data, updateTransaction, deleteTransaction } = useData();
  const [month, setMonth] = useState<string>(currentMonth());
  const [tab, setTab] = useState<Tab>("cards");
  const [editing, setEditing] = useState<Transaction | null>(null);

  const monthly = useMemo(
    () => data.transactions.filter((t) => monthOf(t.date) === month),
    [data.transactions, month]
  );

  const cardTotalsByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of monthly) {
      if (t.paymentMethod !== "credit_card") continue;
      const k = t.cardName || "(その他)";
      m.set(k, (m.get(k) ?? 0) + t.amount);
    }
    return m;
  }, [monthly]);

  const visible = useMemo(() => {
    const sorted = [...monthly].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    );
    if (tab === "cards") return sorted.filter((t) => t.paymentMethod === "credit_card");
    if (tab === "fixed")
      return sorted.filter((t) => t.type === "expense" && t.costType === "fixed");
    return sorted.filter((t) => t.type === "expense" && t.costType !== "fixed");
  }, [monthly, tab]);

  const visibleTotal = visible.reduce((a, b) => a + b.amount, 0);

  function handleDelete(t: Transaction) {
    if (confirm("この取引を削除しますか?")) deleteTransaction(t.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">クレカ・固定費</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.cards.map((c) => (
          <div key={c} className="card">
            <div className="text-xs text-slate-500">{c}</div>
            <div className="text-2xl font-bold mt-1">
              {formatYen(cardTotalsByName.get(c) ?? 0)}
            </div>
            <div className="text-xs text-slate-400 mt-1">今月の利用合計</div>
          </div>
        ))}
        {[...cardTotalsByName.keys()]
          .filter((k) => !data.cards.includes(k))
          .map((c) => (
            <div key={c} className="card">
              <div className="text-xs text-slate-500">{c}</div>
              <div className="text-2xl font-bold mt-1">
                {formatYen(cardTotalsByName.get(c) ?? 0)}
              </div>
            </div>
          ))}
      </div>

      <div className="flex gap-1">
        {(
          [
            { v: "cards", l: "クレカ履歴" },
            { v: "fixed", l: "固定費" },
            { v: "variable", l: "変動費" },
          ] as const
        ).map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              tab === t.v
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-500">{visible.length} 件</span>
          <span className="font-semibold">合計 {formatYen(visibleTotal)}</span>
        </div>
        <TransactionList
          transactions={visible}
          categories={data.categories}
          onEdit={(t) => setEditing(t)}
          onDelete={handleDelete}
        />
      </div>

      <Modal
        open={!!editing}
        title="取引を編集"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <TransactionForm
            initial={editing}
            categories={data.categories}
            cards={data.cards}
            submitLabel="更新"
            onCancel={() => setEditing(null)}
            onSubmit={(t) => {
              updateTransaction(editing.id, t);
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

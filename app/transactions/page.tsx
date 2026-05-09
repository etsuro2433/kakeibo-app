"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useData } from "@/components/DataProvider";
import MonthSwitcher from "@/components/MonthSwitcher";
import TransactionForm from "@/components/TransactionForm";
import TransactionList from "@/components/TransactionList";
import Modal from "@/components/Modal";
import { currentMonth, monthOf } from "@/lib/utils";
import { Transaction, TransactionType } from "@/lib/types";

type Filter = "all" | TransactionType | "fixed" | "variable" | "credit_card";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "expense", label: "支出" },
  { value: "income", label: "収入" },
  { value: "fixed", label: "固定費" },
  { value: "variable", label: "変動費" },
  { value: "credit_card", label: "クレカ" },
];

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-sm">読み込み中…</div>}>
      <TransactionsInner />
    </Suspense>
  );
}

function TransactionsInner() {
  const { data, addTransaction, updateTransaction, deleteTransaction } = useData();
  const search = useSearchParams();
  const [month, setMonth] = useState<string>(currentMonth());
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  useEffect(() => {
    if (search.get("new") === "1") setModalOpen(true);
  }, [search]);

  const list = useMemo(() => {
    return data.transactions
      .filter((t) => monthOf(t.date) === month)
      .filter((t) => {
        switch (filter) {
          case "all":
            return true;
          case "income":
            return t.type === "income";
          case "expense":
            return t.type === "expense";
          case "fixed":
            return t.type === "expense" && t.costType === "fixed";
          case "variable":
            return t.type === "expense" && t.costType !== "fixed";
          case "credit_card":
            return t.paymentMethod === "credit_card";
        }
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [data.transactions, month, filter]);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setModalOpen(true);
  }

  function handleSubmit(t: Omit<Transaction, "id" | "createdAt">) {
    if (editing) {
      updateTransaction(editing.id, t);
    } else {
      addTransaction(t);
    }
    setModalOpen(false);
    setEditing(null);
  }

  function handleDelete(t: Transaction) {
    if (confirm("この取引を削除しますか?")) deleteTransaction(t.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">取引</h1>
        <div className="flex items-center gap-2">
          <MonthSwitcher month={month} onChange={setMonth} />
          <button onClick={openNew} className="btn-primary">+ 追加</button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              filter === f.value
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        <TransactionList
          transactions={list}
          categories={data.categories}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "取引を編集" : "取引を追加"}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      >
        <TransactionForm
          initial={editing ?? undefined}
          categories={data.categories}
          cards={data.cards}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          submitLabel={editing ? "更新" : "追加"}
        />
      </Modal>
    </div>
  );
}

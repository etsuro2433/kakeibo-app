"use client";

import { useEffect, useState } from "react";
import { Category, PaymentMethod, Transaction, TransactionType } from "@/lib/types";
import { todayISO } from "@/lib/utils";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "現金",
  bank: "銀行",
  credit_card: "クレジットカード",
  e_money: "電子マネー",
};

export interface TransactionFormProps {
  initial?: Partial<Transaction>;
  categories: Category[];
  cards: string[];
  onCancel?: () => void;
  onSubmit: (t: Omit<Transaction, "id" | "createdAt">) => void;
  submitLabel?: string;
}

export default function TransactionForm({
  initial,
  categories,
  cards,
  onCancel,
  onSubmit,
  submitLabel = "保存",
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [date, setDate] = useState<string>(initial?.date ?? todayISO());
  const [amount, setAmount] = useState<string>(
    initial?.amount != null ? String(initial.amount) : ""
  );
  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId ?? ""
  );
  const [costType, setCostType] = useState<"fixed" | "variable">(
    initial?.costType ?? "variable"
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? "cash"
  );
  const [cardName, setCardName] = useState<string>(initial?.cardName ?? cards[0] ?? "");
  const [memo, setMemo] = useState<string>(initial?.memo ?? "");

  const filteredCats = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!filteredCats.find((c) => c.id === categoryId)) {
      setCategoryId(filteredCats[0]?.id ?? "");
    }
  }, [type, categoryId, filteredCats]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (!categoryId) return;
    onSubmit({
      date,
      type,
      amount: amt,
      categoryId,
      costType: type === "expense" ? costType : undefined,
      paymentMethod,
      cardName: paymentMethod === "credit_card" ? cardName || undefined : undefined,
      memo: memo.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        {(["expense", "income"] as TransactionType[]).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
              type === t
                ? t === "expense"
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-white border-slate-200 text-slate-500"
            }`}
          >
            {t === "expense" ? "支出" : "収入"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">日付</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">金額 (円)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />
        </div>
      </div>

      <div>
        <label className="label">カテゴリ</label>
        <select
          className="input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          {filteredCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {type === "expense" && (
        <div>
          <label className="label">費目</label>
          <div className="flex gap-2">
            {(["variable", "fixed"] as const).map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setCostType(v)}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  costType === v
                    ? "bg-brand-50 border-brand-300 text-brand-700"
                    : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                {v === "variable" ? "変動費" : "固定費"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="label">支払い方法</label>
        <select
          className="input"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        >
          {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((p) => (
            <option key={p} value={p}>
              {PAYMENT_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {paymentMethod === "credit_card" && (
        <div>
          <label className="label">カード名</label>
          {cards.length > 0 ? (
            <select
              className="input"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
            >
              {cards.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="">(その他)</option>
            </select>
          ) : (
            <input
              className="input"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="カード名"
            />
          )}
        </div>
      )}

      <div>
        <label className="label">メモ</label>
        <input
          className="input"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="任意"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}

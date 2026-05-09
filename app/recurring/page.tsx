"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import Modal from "@/components/Modal";
import { PaymentMethod, RecurringRule, TransactionType } from "@/lib/types";
import { currentMonth, formatYen, monthLabel } from "@/lib/utils";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "現金",
  bank: "銀行",
  credit_card: "クレジットカード",
  e_money: "電子マネー",
};

export default function RecurringPage() {
  const { data, addRecurring, updateRecurring, deleteRecurring } = useData();
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(r: RecurringRule) {
    setEditing(r);
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">定期 (固定費の自動記入)</h1>
        <button onClick={openNew} className="btn-primary">+ 追加</button>
      </div>

      <div className="card">
        {data.recurring.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-10">
            登録された定期ルールはありません。
            <br />
            家賃・サブスク・給与など、毎月決まった日に発生する取引を登録すると自動で記入されます。
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recurring.map((r) => {
              const cat = data.categories.find((c) => c.id === r.categoryId);
              return (
                <li key={r.id} className="py-3 flex items-center gap-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: cat?.color ?? "#94a3b8" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{r.name}</span>
                      {!r.active && (
                        <span className="badge bg-slate-100 text-slate-500">
                          停止中
                        </span>
                      )}
                      {r.type === "expense" && r.costType === "fixed" && (
                        <span className="badge bg-slate-100 text-slate-600">
                          固定費
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      毎月 {r.dayOfMonth} 日 ・ {cat?.name} ・{" "}
                      {PAYMENT_LABELS[r.paymentMethod]}
                      {r.cardName ? ` (${r.cardName})` : ""} ・ 開始{" "}
                      {monthLabel(r.startMonth)}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-semibold shrink-0 ${
                      r.type === "income" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {r.type === "income" ? "+" : "-"}
                    {formatYen(r.amount)}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      className="text-xs text-slate-500 hover:text-brand-700 px-2 py-1"
                      onClick={() => openEdit(r)}
                    >
                      編集
                    </button>
                    <button
                      className="text-xs text-slate-400 hover:text-rose-600 px-2 py-1"
                      onClick={() => {
                        if (
                          confirm(
                            `「${r.name}」を削除しますか? (生成済みの取引は残ります)`
                          )
                        )
                          deleteRecurring(r.id);
                      }}
                    >
                      削除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-500">
        指定日が到来した時点で取引が自動生成されます。同じ月に重複生成されることはありません。
      </p>

      <Modal
        open={open}
        title={editing ? "定期ルールを編集" : "定期ルールを追加"}
        onClose={close}
      >
        <RecurringForm
          initial={editing ?? undefined}
          categories={data.categories}
          cards={data.cards}
          onCancel={close}
          onSubmit={(rule) => {
            if (editing) updateRecurring(editing.id, rule);
            else addRecurring(rule);
            close();
          }}
        />
      </Modal>
    </div>
  );
}

function RecurringForm({
  initial,
  categories,
  cards,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<RecurringRule>;
  categories: { id: string; name: string; type: TransactionType; color: string }[];
  cards: string[];
  onCancel: () => void;
  onSubmit: (
    rule: Omit<RecurringRule, "id" | "createdAt" | "generatedMonths">
  ) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [day, setDay] = useState(String(initial?.dayOfMonth ?? 1));
  const filtered = categories.filter((c) => c.type === type);
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? filtered[0]?.id ?? ""
  );
  const [costType, setCostType] = useState<"fixed" | "variable">(
    initial?.costType ?? "fixed"
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? "bank"
  );
  const [cardName, setCardName] = useState(initial?.cardName ?? cards[0] ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [startMonth, setStartMonth] = useState(
    initial?.startMonth ?? currentMonth()
  );
  const [active, setActive] = useState(initial?.active ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    const d = Number(day);
    if (!name.trim() || !categoryId || !Number.isFinite(amt) || amt <= 0) return;
    if (!Number.isFinite(d) || d < 1 || d > 31) return;
    onSubmit({
      name: name.trim(),
      type,
      amount: amt,
      dayOfMonth: d,
      categoryId: filtered.find((c) => c.id === categoryId)
        ? categoryId
        : filtered[0]?.id ?? categoryId,
      costType: type === "expense" ? costType : undefined,
      paymentMethod,
      cardName: paymentMethod === "credit_card" ? cardName || undefined : undefined,
      memo: memo.trim() || undefined,
      startMonth,
      active,
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

      <div>
        <label className="label">名称</label>
        <input
          className="input"
          placeholder="例: 家賃 / Netflix / 給与"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">毎月の日</label>
          <input
            type="number"
            min={1}
            max={31}
            className="input"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">
            その月に存在しない日 (例: 31) は月末扱い
          </p>
        </div>
        <div>
          <label className="label">金額 (円)</label>
          <input
            type="number"
            min={0}
            step={1}
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
        >
          {filtered.map((c) => (
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
            {(["fixed", "variable"] as const).map((v) => (
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
                {v === "fixed" ? "固定費" : "変動費"}
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
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">開始月</label>
          <input
            type="month"
            className="input"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            有効にする
          </label>
        </div>
      </div>

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
          {initial ? "更新" : "追加"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          キャンセル
        </button>
      </div>
    </form>
  );
}

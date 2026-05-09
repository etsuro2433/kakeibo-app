"use client";

import { Category, Transaction } from "@/lib/types";
import { formatYen } from "@/lib/utils";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "現金",
  bank: "銀行",
  credit_card: "クレカ",
  e_money: "電子",
};

export default function TransactionList({
  transactions,
  categories,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  categories: Category[];
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
}) {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  if (transactions.length === 0) {
    return (
      <div className="text-center text-sm text-slate-400 py-12">
        該当する取引はありません
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {transactions.map((t) => {
        const cat = catMap.get(t.categoryId);
        return (
          <li key={t.id} className="py-3 flex items-center gap-3">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: cat?.color ?? "#94a3b8" }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{cat?.name ?? "(未分類)"}</span>
                {t.type === "expense" && t.costType === "fixed" && (
                  <span className="badge bg-slate-100 text-slate-600">固定費</span>
                )}
                {t.paymentMethod === "credit_card" && (
                  <span className="badge bg-indigo-50 text-indigo-700">
                    {t.cardName || "クレカ"}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {t.date} ・ {PAYMENT_LABELS[t.paymentMethod] ?? t.paymentMethod}
                {t.memo ? ` ・ ${t.memo}` : ""}
              </div>
            </div>
            <div
              className={`text-sm font-semibold shrink-0 ${
                t.type === "income" ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {t.type === "income" ? "+" : "-"}
              {formatYen(t.amount)}
            </div>
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-1 shrink-0">
                {onEdit && (
                  <button
                    className="text-xs text-slate-500 hover:text-brand-700 px-2 py-1"
                    onClick={() => onEdit(t)}
                  >
                    編集
                  </button>
                )}
                {onDelete && (
                  <button
                    className="text-xs text-slate-400 hover:text-rose-600 px-2 py-1"
                    onClick={() => onDelete(t)}
                  >
                    削除
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

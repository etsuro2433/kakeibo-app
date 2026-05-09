"use client";

import { formatYen } from "@/lib/utils";

export default function SummaryCards({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const balance = income - expense;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="card">
        <div className="text-xs text-slate-500">収入</div>
        <div className="text-2xl font-bold text-emerald-600 mt-1">
          {formatYen(income)}
        </div>
      </div>
      <div className="card">
        <div className="text-xs text-slate-500">支出</div>
        <div className="text-2xl font-bold text-rose-600 mt-1">
          {formatYen(expense)}
        </div>
      </div>
      <div className="card">
        <div className="text-xs text-slate-500">収支</div>
        <div
          className={`text-2xl font-bold mt-1 ${
            balance >= 0 ? "text-brand-700" : "text-rose-600"
          }`}
        >
          {formatYen(balance)}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/components/DataProvider";
import SummaryCards from "@/components/SummaryCards";
import CategoryPie from "@/components/CategoryPie";
import MonthlyBar from "@/components/MonthlyBar";
import BudgetBars from "@/components/BudgetBars";
import MonthSwitcher from "@/components/MonthSwitcher";
import { currentMonth, formatYen, monthOf } from "@/lib/utils";

export default function DashboardPage() {
  const { data, ready } = useData();
  const [month, setMonth] = useState<string>(currentMonth());

  const monthly = useMemo(
    () => data.transactions.filter((t) => monthOf(t.date) === month),
    [data.transactions, month]
  );

  const income = monthly.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const expense = monthly.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  const fixed = monthly.filter((t) => t.type === "expense" && t.costType === "fixed")
    .reduce((a, b) => a + b.amount, 0);
  const variable = monthly.filter((t) => t.type === "expense" && t.costType !== "fixed")
    .reduce((a, b) => a + b.amount, 0);

  if (!ready) {
    return <div className="text-slate-400 text-sm">読み込み中…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">ダッシュボード</h1>
        <div className="flex items-center gap-2">
          <MonthSwitcher month={month} onChange={setMonth} />
          <Link href="/transactions?new=1" className="btn-primary">
            + 取引を追加
          </Link>
        </div>
      </div>

      <SummaryCards income={income} expense={expense} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs text-slate-500">固定費</div>
          <div className="text-xl font-semibold mt-1">{formatYen(fixed)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">変動費</div>
          <div className="text-xl font-semibold mt-1">{formatYen(variable)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">カテゴリ別支出</h2>
          <CategoryPie transactions={monthly} categories={data.categories} />
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">直近6ヶ月の収支</h2>
          <MonthlyBar transactions={data.transactions} pivotMonth={month} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">予算進捗</h2>
          <Link href="/budgets" className="text-xs text-brand-600 hover:underline">
            予算を設定
          </Link>
        </div>
        <BudgetBars
          transactions={monthly}
          categories={data.categories}
          budgets={data.budgets}
        />
      </div>
    </div>
  );
}

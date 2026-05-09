"use client";

import { Budget, Category, Transaction } from "@/lib/types";
import { formatYen } from "@/lib/utils";

export default function BudgetBars({
  transactions,
  categories,
  budgets,
}: {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
}) {
  if (budgets.length === 0) {
    return (
      <div className="text-sm text-slate-400 py-8 text-center">
        「予算」ページからカテゴリ別の月次予算を設定できます
      </div>
    );
  }
  const spent = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    spent.set(t.categoryId, (spent.get(t.categoryId) ?? 0) + t.amount);
  }
  const rows = budgets
    .map((b) => {
      const cat = categories.find((c) => c.id === b.categoryId);
      const used = spent.get(b.categoryId) ?? 0;
      return { budget: b, cat, used };
    })
    .filter((r) => r.cat)
    .sort((a, b) => b.used / (b.budget.amount || 1) - a.used / (a.budget.amount || 1));

  return (
    <ul className="space-y-3">
      {rows.map(({ budget, cat, used }) => {
        const pct = budget.amount > 0 ? Math.min(200, (used / budget.amount) * 100) : 0;
        const over = used > budget.amount;
        const near = pct >= 80 && !over;
        return (
          <li key={budget.categoryId}>
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: cat?.color ?? "#94a3b8" }}
                />
                <span className="font-medium">{cat?.name}</span>
                {over && (
                  <span className="badge bg-rose-100 text-rose-700">超過</span>
                )}
                {near && (
                  <span className="badge bg-amber-100 text-amber-700">残りわずか</span>
                )}
              </div>
              <div className="text-slate-500">
                <span className={over ? "text-rose-600 font-semibold" : ""}>
                  {formatYen(used)}
                </span>{" "}
                / {formatYen(budget.amount)}
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  over ? "bg-rose-500" : near ? "bg-amber-400" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

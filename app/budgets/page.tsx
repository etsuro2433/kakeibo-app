"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import MonthSwitcher from "@/components/MonthSwitcher";
import { currentMonth, formatYen, monthOf } from "@/lib/utils";

export default function BudgetsPage() {
  const { data, setBudget, removeBudget } = useData();
  const [month, setMonth] = useState<string>(currentMonth());
  const [draft, setDraft] = useState<Record<string, string>>({});

  const expenseCats = data.categories.filter((c) => c.type === "expense");

  const spent = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of data.transactions) {
      if (t.type !== "expense") continue;
      if (monthOf(t.date) !== month) continue;
      m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
    }
    return m;
  }, [data.transactions, month]);

  function valueFor(catId: string): string {
    if (draft[catId] !== undefined) return draft[catId];
    const b = data.budgets.find((x) => x.categoryId === catId);
    return b ? String(b.amount) : "";
  }

  function save(catId: string) {
    const v = Number(draft[catId] ?? "");
    if (!Number.isFinite(v) || v < 0) return;
    if (v === 0) removeBudget(catId);
    else setBudget(catId, v);
    setDraft((d) => {
      const n = { ...d };
      delete n[catId];
      return n;
    });
  }

  const totalBudget = data.budgets.reduce((a, b) => a + b.amount, 0);
  const totalSpent = [...spent.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">予算</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card">
          <div className="text-xs text-slate-500">予算合計</div>
          <div className="text-xl font-bold mt-1">{formatYen(totalBudget)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">使用額</div>
          <div className="text-xl font-bold mt-1 text-rose-600">{formatYen(totalSpent)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">残り</div>
          <div
            className={`text-xl font-bold mt-1 ${
              totalBudget - totalSpent < 0 ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {formatYen(totalBudget - totalSpent)}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold mb-3">カテゴリ別月次予算</h2>
        <ul className="divide-y divide-slate-100">
          {expenseCats.map((c) => {
            const used = spent.get(c.id) ?? 0;
            const budget = Number(valueFor(c.id) || 0);
            const pct = budget > 0 ? Math.min(200, (used / budget) * 100) : 0;
            const over = budget > 0 && used > budget;
            return (
              <li key={c.id} className="py-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-[8rem]">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    使用 <span className={over ? "text-rose-600 font-semibold" : ""}>
                      {formatYen(used)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">¥</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      className="input w-32"
                      value={valueFor(c.id)}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [c.id]: e.target.value }))
                      }
                      onBlur={() => save(c.id)}
                      placeholder="0"
                    />
                  </div>
                </div>
                {budget > 0 && (
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full ${
                        over ? "bg-rose-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-slate-400 mt-3">
          0 円を入力して欄外をクリックすると予算を解除できます。
        </p>
      </div>
    </div>
  );
}

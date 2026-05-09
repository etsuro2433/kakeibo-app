"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Transaction } from "@/lib/types";
import { formatYen, monthOf, shiftMonth } from "@/lib/utils";

export default function MonthlyBar({
  transactions,
  pivotMonth,
}: {
  transactions: Transaction[];
  pivotMonth: string;
}) {
  const months: string[] = [];
  for (let i = -5; i <= 0; i++) months.push(shiftMonth(pivotMonth, i));

  const data = months.map((m) => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (monthOf(t.date) !== m) continue;
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    const [y, mm] = m.split("-");
    return { month: `${Number(mm)}月`, year: y, 収入: income, 支出: expense };
  });

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <Tooltip formatter={(v: number) => formatYen(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="収入" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="支出" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

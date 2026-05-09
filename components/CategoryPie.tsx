"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Category, Transaction } from "@/lib/types";
import { formatYen } from "@/lib/utils";

export default function CategoryPie({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: Category[];
}) {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  const data = categories
    .filter((c) => c.type === "expense" && totals.get(c.id))
    .map((c) => ({ name: c.name, value: totals.get(c.id) ?? 0, color: c.color }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-slate-400 py-12">
        この月の支出はまだありません
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => formatYen(v)} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

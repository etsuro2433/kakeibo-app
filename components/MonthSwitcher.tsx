"use client";

import { monthLabel, shiftMonth } from "@/lib/utils";

export default function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (m: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-sm">
      <button
        className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-l-lg"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="前の月"
      >
        ‹
      </button>
      <div className="px-3 py-2 text-sm font-semibold min-w-[7rem] text-center">
        {monthLabel(month)}
      </div>
      <button
        className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-r-lg"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="次の月"
      >
        ›
      </button>
    </div>
  );
}

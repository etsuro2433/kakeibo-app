import { RecurringRule, Transaction } from "./types";
import { shiftMonth, uid } from "./utils";

export interface ApplyResult {
  newTransactions: Transaction[];
  updatedRules: RecurringRule[];
  changed: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function applyRecurring(
  rules: RecurringRule[],
  today: Date = new Date()
): ApplyResult {
  const newTransactions: Transaction[] = [];
  const updatedRules: RecurringRule[] = [];
  const todayMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  let changed = false;

  for (const rule of rules) {
    if (!rule.active || rule.startMonth > todayMonth) {
      updatedRules.push(rule);
      continue;
    }
    const generated = new Set(rule.generatedMonths);
    const months: string[] = [];
    let cursor = rule.startMonth;
    let cap = 36; // 暴走防止
    while (cursor <= todayMonth && cap-- > 0) {
      months.push(cursor);
      cursor = shiftMonth(cursor, 1);
    }
    let ruleChanged = false;
    for (const m of months) {
      if (generated.has(m)) continue;
      const [y, mm] = m.split("-").map(Number);
      const lastDay = new Date(y, mm, 0).getDate();
      const day = Math.min(Math.max(1, rule.dayOfMonth), lastDay);
      const date = ymd(y, mm, day);
      // 当月は今日以降の予定日であればまだ生成しない
      if (m === todayMonth) {
        const eventTs = new Date(y, mm - 1, day).getTime();
        const todayTs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        if (eventTs > todayTs) continue;
      }
      newTransactions.push({
        id: uid("tx"),
        date,
        type: rule.type,
        amount: rule.amount,
        categoryId: rule.categoryId,
        costType:
          rule.type === "expense" ? rule.costType ?? "fixed" : undefined,
        paymentMethod: rule.paymentMethod,
        cardName: rule.cardName,
        memo: rule.memo
          ? `${rule.memo} (自動: ${rule.name})`
          : `${rule.name} (自動)`,
        recurringId: rule.id,
        createdAt: new Date().toISOString(),
      });
      generated.add(m);
      ruleChanged = true;
      changed = true;
    }
    updatedRules.push(
      ruleChanged ? { ...rule, generatedMonths: [...generated] } : rule
    );
  }
  return { newTransactions, updatedRules, changed };
}

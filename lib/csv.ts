import { Category, Transaction } from "./types";
import { uid } from "./utils";

const HEADERS = [
  "date",
  "type",
  "amount",
  "category",
  "costType",
  "paymentMethod",
  "cardName",
  "memo",
];

function escapeCSV(v: string): string {
  if (v == null) return "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function exportCSV(transactions: Transaction[], categories: Category[]): string {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const lines = [HEADERS.join(",")];
  for (const t of transactions) {
    lines.push(
      [
        t.date,
        t.type,
        String(t.amount),
        catMap.get(t.categoryId) ?? "",
        t.costType ?? "",
        t.paymentMethod,
        t.cardName ?? "",
        t.memo ?? "",
      ]
        .map(escapeCSV)
        .join(",")
    );
  }
  return lines.join("\n");
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQ = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

export interface ImportResult {
  added: Transaction[];
  newCategories: Category[];
  skipped: number;
}

export function importCSV(text: string, categories: Category[]): ImportResult {
  const rows = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (rows.length === 0) return { added: [], newCategories: [], skipped: 0 };
  const header = parseCSVLine(rows[0]).map((s) => s.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const dateI = idx("date");
  const typeI = idx("type");
  const amtI = idx("amount");
  const catI = idx("category");
  const costI = idx("costtype");
  const payI = idx("paymentmethod");
  const cardI = idx("cardname");
  const memoI = idx("memo");

  const added: Transaction[] = [];
  const newCategories: Category[] = [];
  const catByName = new Map(categories.map((c) => [`${c.type}:${c.name}`, c]));
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const cols = parseCSVLine(rows[i]);
    const date = cols[dateI]?.trim();
    const type = cols[typeI]?.trim() as Transaction["type"];
    const amount = Number(cols[amtI]);
    const catName = cols[catI]?.trim();
    if (!date || !type || !Number.isFinite(amount) || !catName) {
      skipped++;
      continue;
    }
    const key = `${type}:${catName}`;
    let cat = catByName.get(key);
    if (!cat) {
      cat = {
        id: uid("cat"),
        name: catName,
        type,
        color: type === "income" ? "#10b981" : "#94a3b8",
      };
      catByName.set(key, cat);
      newCategories.push(cat);
    }
    const costRaw = cols[costI]?.trim();
    const payRaw = (cols[payI]?.trim() || "cash") as Transaction["paymentMethod"];
    added.push({
      id: uid("tx"),
      date,
      type,
      amount,
      categoryId: cat.id,
      costType:
        type === "expense"
          ? costRaw === "fixed" || costRaw === "variable"
            ? costRaw
            : "variable"
          : undefined,
      paymentMethod: payRaw,
      cardName: cols[cardI]?.trim() || undefined,
      memo: cols[memoI]?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  }
  return { added, newCategories, skipped };
}

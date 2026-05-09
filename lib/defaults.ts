import { AppData, Category } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  // 支出
  { id: "cat_food", name: "食費", type: "expense", color: "#f97316" },
  { id: "cat_daily", name: "日用品", type: "expense", color: "#84cc16" },
  { id: "cat_housing", name: "住居費", type: "expense", color: "#0ea5e9" },
  { id: "cat_utility", name: "水道光熱費", type: "expense", color: "#06b6d4" },
  { id: "cat_communication", name: "通信費", type: "expense", color: "#6366f1" },
  { id: "cat_transport", name: "交通費", type: "expense", color: "#a855f7" },
  { id: "cat_medical", name: "医療費", type: "expense", color: "#ec4899" },
  { id: "cat_education", name: "教育費", type: "expense", color: "#14b8a6" },
  { id: "cat_entertain", name: "娯楽費", type: "expense", color: "#f59e0b" },
  { id: "cat_insurance", name: "保険料", type: "expense", color: "#64748b" },
  { id: "cat_subscription", name: "サブスク", type: "expense", color: "#7c3aed" },
  { id: "cat_other_exp", name: "その他", type: "expense", color: "#94a3b8" },
  // 収入
  { id: "cat_salary", name: "給与", type: "income", color: "#10b981" },
  { id: "cat_bonus", name: "賞与", type: "income", color: "#22c55e" },
  { id: "cat_other_inc", name: "その他収入", type: "income", color: "#65a30d" },
];

export const DEFAULT_CARDS: string[] = ["楽天カード(本人)", "楽天カード(家族)"];

export const INITIAL_DATA: AppData = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  budgets: [],
  cards: DEFAULT_CARDS,
  recurring: [],
  version: 2,
};

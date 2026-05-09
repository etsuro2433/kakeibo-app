export type TransactionType = "income" | "expense";
export type CostType = "fixed" | "variable";
export type PaymentMethod = "cash" | "bank" | "credit_card" | "e_money";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  categoryId: string;
  costType?: CostType; // expense のみ
  paymentMethod: PaymentMethod;
  cardName?: string; // credit_card のみ
  memo?: string;
  createdAt: string;
}

export interface Budget {
  categoryId: string;
  amount: number; // 月次予算
}

export interface AppData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  cards: string[]; // 家族用クレカ名 (例: 楽天カード本人, 楽天カード家族)
  version: number;
}

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
  receiptDataUrl?: string; // レシート画像 (圧縮済み JPEG dataURL)
  recurringId?: string; // 自動生成元の RecurringRule.id
  createdAt: string;
}

export interface RecurringRule {
  id: string;
  name: string; // 例: 家賃、Netflix
  dayOfMonth: number; // 1-31, 31 を超えたら月末
  type: TransactionType;
  amount: number;
  categoryId: string;
  costType?: CostType;
  paymentMethod: PaymentMethod;
  cardName?: string;
  memo?: string;
  active: boolean;
  startMonth: string; // YYYY-MM (これ以降の月で自動生成)
  generatedMonths: string[]; // 既に取引を生成済みの月 (重複防止)
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
  recurring: RecurringRule[];
  version: number;
}

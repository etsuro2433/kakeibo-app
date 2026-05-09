"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppData, Budget, Category, Transaction } from "@/lib/types";
import { INITIAL_DATA } from "@/lib/defaults";
import { loadData, saveData } from "@/lib/storage";
import { uid } from "@/lib/utils";

interface DataContextValue {
  data: AppData;
  ready: boolean;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (c: Omit<Category, "id">) => Category;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  setBudget: (categoryId: string, amount: number) => void;
  removeBudget: (categoryId: string) => void;
  addCard: (name: string) => void;
  removeCard: (name: string) => void;
  replaceAll: (next: AppData) => void;
  bulkAddTransactions: (txs: Transaction[], newCats: Category[]) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveData(data);
  }, [data, ready]);

  const addTransaction = useCallback((t: Omit<Transaction, "id" | "createdAt">) => {
    setData((d) => ({
      ...d,
      transactions: [
        { ...t, id: uid("tx"), createdAt: new Date().toISOString() },
        ...d.transactions,
      ],
    }));
  }, []);

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    setData((d) => ({
      ...d,
      transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
  }, []);

  const addCategory = useCallback((c: Omit<Category, "id">): Category => {
    const cat: Category = { ...c, id: uid("cat") };
    setData((d) => ({ ...d, categories: [...d.categories, cat] }));
    return cat;
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id),
      budgets: d.budgets.filter((b) => b.categoryId !== id),
    }));
  }, []);

  const setBudget = useCallback((categoryId: string, amount: number) => {
    setData((d) => {
      const exists = d.budgets.some((b) => b.categoryId === categoryId);
      const budgets: Budget[] = exists
        ? d.budgets.map((b) => (b.categoryId === categoryId ? { ...b, amount } : b))
        : [...d.budgets, { categoryId, amount }];
      return { ...d, budgets };
    });
  }, []);

  const removeBudget = useCallback((categoryId: string) => {
    setData((d) => ({ ...d, budgets: d.budgets.filter((b) => b.categoryId !== categoryId) }));
  }, []);

  const addCard = useCallback((name: string) => {
    setData((d) =>
      d.cards.includes(name) ? d : { ...d, cards: [...d.cards, name] }
    );
  }, []);

  const removeCard = useCallback((name: string) => {
    setData((d) => ({ ...d, cards: d.cards.filter((c) => c !== name) }));
  }, []);

  const replaceAll = useCallback((next: AppData) => {
    setData(next);
  }, []);

  const bulkAddTransactions = useCallback((txs: Transaction[], newCats: Category[]) => {
    setData((d) => ({
      ...d,
      categories: [...d.categories, ...newCats],
      transactions: [...txs, ...d.transactions],
    }));
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      ready,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCategory,
      updateCategory,
      deleteCategory,
      setBudget,
      removeBudget,
      addCard,
      removeCard,
      replaceAll,
      bulkAddTransactions,
    }),
    [
      data,
      ready,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCategory,
      updateCategory,
      deleteCategory,
      setBudget,
      removeBudget,
      addCard,
      removeCard,
      replaceAll,
      bulkAddTransactions,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

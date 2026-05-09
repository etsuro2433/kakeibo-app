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
import { AppData, Budget, Category, RecurringRule, Transaction } from "@/lib/types";
import { INITIAL_DATA } from "@/lib/defaults";
import { loadData, saveData } from "@/lib/storage";
import { uid } from "@/lib/utils";
import { applyRecurring } from "@/lib/recurring";

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
  addRecurring: (
    rule: Omit<RecurringRule, "id" | "createdAt" | "generatedMonths">
  ) => RecurringRule;
  updateRecurring: (id: string, patch: Partial<RecurringRule>) => void;
  deleteRecurring: (id: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadData();
    const result = applyRecurring(loaded.recurring);
    if (result.changed) {
      setData({
        ...loaded,
        recurring: result.updatedRules,
        transactions: [...result.newTransactions, ...loaded.transactions],
      });
    } else {
      setData(loaded);
    }
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

  const addRecurring = useCallback(
    (rule: Omit<RecurringRule, "id" | "createdAt" | "generatedMonths">): RecurringRule => {
      const full: RecurringRule = {
        ...rule,
        id: uid("rec"),
        createdAt: new Date().toISOString(),
        generatedMonths: [],
      };
      setData((d) => {
        const nextRules = [...d.recurring, full];
        const result = applyRecurring(nextRules);
        return {
          ...d,
          recurring: result.changed ? result.updatedRules : nextRules,
          transactions: [...result.newTransactions, ...d.transactions],
        };
      });
      return full;
    },
    []
  );

  const updateRecurring = useCallback((id: string, patch: Partial<RecurringRule>) => {
    setData((d) => {
      const updated = d.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r));
      const result = applyRecurring(updated);
      return {
        ...d,
        recurring: result.changed ? result.updatedRules : updated,
        transactions: [...result.newTransactions, ...d.transactions],
      };
    });
  }, []);

  const deleteRecurring = useCallback((id: string) => {
    setData((d) => ({ ...d, recurring: d.recurring.filter((r) => r.id !== id) }));
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
      addRecurring,
      updateRecurring,
      deleteRecurring,
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
      addRecurring,
      updateRecurring,
      deleteRecurring,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

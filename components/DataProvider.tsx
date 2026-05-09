"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppData, Budget, Category, RecurringRule, Transaction } from "@/lib/types";
import { INITIAL_DATA } from "@/lib/defaults";
import { loadData, saveData } from "@/lib/storage";
import { uid } from "@/lib/utils";
import { applyRecurring } from "@/lib/recurring";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";
import { getHouseholdId } from "@/lib/household";
import * as db from "@/lib/db";

interface DataContextValue {
  data: AppData;
  ready: boolean;
  cloudEnabled: boolean;
  householdId: string;
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
  addRecurring: (rule: Omit<RecurringRule, "id" | "createdAt" | "generatedMonths">) => RecurringRule;
  updateRecurring: (id: string, patch: Partial<RecurringRule>) => void;
  deleteRecurring: (id: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [ready, setReady] = useState(false);
  const cloudEnabled = isSupabaseEnabled();
  const [householdId, setHouseholdIdState] = useState("");
  const hid = useRef("");

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = getHouseholdId();
    hid.current = id;
    setHouseholdIdState(id);

    async function init() {
      if (cloudEnabled) {
        try {
          const loaded = await db.dbLoad(id);
          const result = applyRecurring(loaded.recurring);
          if (result.changed) {
            const merged = {
              ...loaded,
              recurring: result.updatedRules,
              transactions: [...result.newTransactions, ...loaded.transactions],
            };
            // persist generated transactions
            await db.dbBulkInsertTransactions(result.newTransactions, id);
            for (const r of result.updatedRules) {
              await db.dbUpdateRecurring(r, id);
            }
            setData(merged);
          } else {
            setData(loaded);
          }
        } catch (e) {
          console.error("Supabase load failed, falling back to localStorage", e);
          setData(loadData());
        }
      } else {
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
      }
      setReady(true);
    }
    init();
  }, [cloudEnabled]);

  // ── localStorage fallback sync ────────────────────────────────────────────
  useEffect(() => {
    if (ready && !cloudEnabled) saveData(data);
  }, [data, ready, cloudEnabled]);

  // ── Supabase realtime subscriptions ──────────────────────────────────────
  useEffect(() => {
    if (!cloudEnabled || !supabase || !ready) return;
    const id = hid.current;

    const channel = supabase
      .channel(`household-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `household_id=eq.${id}` },
        (payload) => {
          const t = rowToTx(payload.new);
          setData((d) => ({
            ...d,
            transactions: d.transactions.some((x) => x.id === t.id)
              ? d.transactions
              : [t, ...d.transactions],
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `household_id=eq.${id}` },
        (payload) => {
          const t = rowToTx(payload.new);
          setData((d) => ({
            ...d,
            transactions: d.transactions.map((x) => (x.id === t.id ? t : x)),
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "transactions" },
        (payload) => {
          setData((d) => ({
            ...d,
            transactions: d.transactions.filter((x) => x.id !== payload.old.id),
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories", filter: `household_id=eq.${id}` },
        () => {
          supabase!
            .from("categories")
            .select("*")
            .eq("household_id", id)
            .then(({ data: cats }) => {
              if (cats) setData((d) => ({ ...d, categories: cats.map(rowToCat) }));
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets", filter: `household_id=eq.${id}` },
        () => {
          supabase!
            .from("budgets")
            .select("*")
            .eq("household_id", id)
            .then(({ data: rows }) => {
              if (rows)
                setData((d) => ({
                  ...d,
                  budgets: rows.map((r) => ({ categoryId: r.category_id, amount: Number(r.amount) })),
                }));
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recurring_rules", filter: `household_id=eq.${id}` },
        () => {
          supabase!
            .from("recurring_rules")
            .select("*")
            .eq("household_id", id)
            .then(({ data: rows }) => {
              if (rows) setData((d) => ({ ...d, recurring: rows.map(rowToRule) }));
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "household_cards", filter: `household_id=eq.${id}` },
        () => {
          supabase!
            .from("household_cards")
            .select("*")
            .eq("household_id", id)
            .order("sort_order")
            .then(({ data: rows }) => {
              if (rows) setData((d) => ({ ...d, cards: rows.map((r) => r.name) }));
            });
        }
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [cloudEnabled, ready]);

  // ── mutations ─────────────────────────────────────────────────────────────

  const addTransaction = useCallback(
    (t: Omit<Transaction, "id" | "createdAt">) => {
      const full: Transaction = { ...t, id: uid("tx"), createdAt: new Date().toISOString() };
      setData((d) => ({ ...d, transactions: [full, ...d.transactions] }));
      if (cloudEnabled) db.dbAddTransaction(full, hid.current).catch(console.error);
    },
    [cloudEnabled]
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Transaction>) => {
      setData((d) => ({
        ...d,
        transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      if (cloudEnabled) {
        setData((d) => {
          const t = d.transactions.find((x) => x.id === id);
          if (t) db.dbUpdateTransaction(t, hid.current).catch(console.error);
          return d;
        });
      }
    },
    [cloudEnabled]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
      if (cloudEnabled) db.dbDeleteTransaction(id).catch(console.error);
    },
    [cloudEnabled]
  );

  const addCategory = useCallback(
    (c: Omit<Category, "id">): Category => {
      const cat: Category = { ...c, id: uid("cat") };
      setData((d) => ({ ...d, categories: [...d.categories, cat] }));
      if (cloudEnabled) db.dbAddCategory(cat, hid.current).catch(console.error);
      return cat;
    },
    [cloudEnabled]
  );

  const updateCategory = useCallback(
    (id: string, patch: Partial<Category>) => {
      setData((d) => ({
        ...d,
        categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
      if (cloudEnabled) {
        setData((d) => {
          const c = d.categories.find((x) => x.id === id);
          if (c) db.dbUpdateCategory(c, hid.current).catch(console.error);
          return d;
        });
      }
    },
    [cloudEnabled]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      setData((d) => ({
        ...d,
        categories: d.categories.filter((c) => c.id !== id),
        budgets: d.budgets.filter((b) => b.categoryId !== id),
      }));
      if (cloudEnabled) db.dbDeleteCategory(id).catch(console.error);
    },
    [cloudEnabled]
  );

  const setBudget = useCallback(
    (categoryId: string, amount: number) => {
      setData((d) => {
        const exists = d.budgets.some((b) => b.categoryId === categoryId);
        const budgets: Budget[] = exists
          ? d.budgets.map((b) => (b.categoryId === categoryId ? { ...b, amount } : b))
          : [...d.budgets, { categoryId, amount }];
        return { ...d, budgets };
      });
      if (cloudEnabled)
        db.dbSetBudget({ categoryId, amount }, hid.current).catch(console.error);
    },
    [cloudEnabled]
  );

  const removeBudget = useCallback(
    (categoryId: string) => {
      setData((d) => ({ ...d, budgets: d.budgets.filter((b) => b.categoryId !== categoryId) }));
      if (cloudEnabled) db.dbRemoveBudget(categoryId, hid.current).catch(console.error);
    },
    [cloudEnabled]
  );

  const addCard = useCallback(
    (name: string) => {
      setData((d) => (d.cards.includes(name) ? d : { ...d, cards: [...d.cards, name] }));
      if (cloudEnabled)
        db.dbAddCard(name, hid.current, Date.now()).catch(console.error);
    },
    [cloudEnabled]
  );

  const removeCard = useCallback(
    (name: string) => {
      setData((d) => ({ ...d, cards: d.cards.filter((c) => c !== name) }));
      if (cloudEnabled) db.dbRemoveCard(name, hid.current).catch(console.error);
    },
    [cloudEnabled]
  );

  const replaceAll = useCallback((next: AppData) => {
    setData(next);
  }, []);

  const bulkAddTransactions = useCallback(
    (txs: Transaction[], newCats: Category[]) => {
      setData((d) => ({
        ...d,
        categories: [...d.categories, ...newCats],
        transactions: [...txs, ...d.transactions],
      }));
      if (cloudEnabled) {
        db.dbBulkInsertTransactions(txs, hid.current).catch(console.error);
        db.dbBulkInsertCategories(newCats, hid.current).catch(console.error);
      }
    },
    [cloudEnabled]
  );

  const addRecurring = useCallback(
    (rule: Omit<RecurringRule, "id" | "createdAt" | "generatedMonths">): RecurringRule => {
      const full: RecurringRule = {
        ...rule, id: uid("rec"), createdAt: new Date().toISOString(), generatedMonths: [],
      };
      const result = applyRecurring([full]);
      const finalRule = result.changed ? result.updatedRules[0] : full;
      setData((d) => ({
        ...d,
        recurring: [...d.recurring, finalRule],
        transactions: [...result.newTransactions, ...d.transactions],
      }));
      if (cloudEnabled) {
        db.dbAddRecurring(finalRule, hid.current).catch(console.error);
        db.dbBulkInsertTransactions(result.newTransactions, hid.current).catch(console.error);
      }
      return finalRule;
    },
    [cloudEnabled]
  );

  const updateRecurring = useCallback(
    (id: string, patch: Partial<RecurringRule>) => {
      setData((d) => {
        const updated = d.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r));
        const result = applyRecurring(updated);
        if (cloudEnabled) {
          for (const r of result.updatedRules) db.dbUpdateRecurring(r, hid.current).catch(console.error);
          db.dbBulkInsertTransactions(result.newTransactions, hid.current).catch(console.error);
        }
        return {
          ...d,
          recurring: result.changed ? result.updatedRules : updated,
          transactions: [...result.newTransactions, ...d.transactions],
        };
      });
    },
    [cloudEnabled]
  );

  const deleteRecurring = useCallback(
    (id: string) => {
      setData((d) => ({ ...d, recurring: d.recurring.filter((r) => r.id !== id) }));
      if (cloudEnabled) db.dbDeleteRecurring(id).catch(console.error);
    },
    [cloudEnabled]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      data, ready, cloudEnabled, householdId,
      addTransaction, updateTransaction, deleteTransaction,
      addCategory, updateCategory, deleteCategory,
      setBudget, removeBudget, addCard, removeCard,
      replaceAll, bulkAddTransactions,
      addRecurring, updateRecurring, deleteRecurring,
    }),
    [
      data, ready, cloudEnabled, householdId,
      addTransaction, updateTransaction, deleteTransaction,
      addCategory, updateCategory, deleteCategory,
      setBudget, removeBudget, addCard, removeCard,
      replaceAll, bulkAddTransactions,
      addRecurring, updateRecurring, deleteRecurring,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

// ── row mappers (same as db.ts but kept here for realtime callbacks) ─────────

const _s = (v: unknown) => String(v ?? "");
const _ns = (v: unknown) => (v != null ? String(v) : undefined);

function rowToTx(r: Record<string, unknown>): Transaction {
  return {
    id: _s(r.id), date: _s(r.date), type: _s(r.type) as Transaction["type"],
    amount: Number(r.amount), categoryId: _s(r.category_id),
    costType: _ns(r.cost_type) as Transaction["costType"],
    paymentMethod: _s(r.payment_method) as Transaction["paymentMethod"],
    cardName: _ns(r.card_name), memo: _ns(r.memo),
    receiptDataUrl: _ns(r.receipt_data_url), recurringId: _ns(r.recurring_id),
    createdAt: _s(r.created_at),
  };
}

function rowToCat(r: Record<string, unknown>): Category {
  return { id: _s(r.id), name: _s(r.name), type: _s(r.type) as Category["type"], color: _s(r.color) };
}

function rowToRule(r: Record<string, unknown>): RecurringRule {
  return {
    id: _s(r.id), name: _s(r.name), dayOfMonth: Number(r.day_of_month),
    type: _s(r.type) as RecurringRule["type"], amount: Number(r.amount),
    categoryId: _s(r.category_id), costType: _ns(r.cost_type) as RecurringRule["costType"],
    paymentMethod: _s(r.payment_method) as RecurringRule["paymentMethod"],
    cardName: _ns(r.card_name), memo: _ns(r.memo), active: Boolean(r.active),
    startMonth: _s(r.start_month),
    generatedMonths: Array.isArray(r.generated_months) ? (r.generated_months as string[]) : [],
    createdAt: _s(r.created_at),
  };
}

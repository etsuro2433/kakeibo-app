import { supabase } from "./supabase";
import { AppData, Budget, Category, RecurringRule, Transaction } from "./types";
import { DEFAULT_CATEGORIES, DEFAULT_CARDS } from "./defaults";

// ── helpers ─────────────────────────────────────────────────────────────────

function txRow(t: Transaction, hid: string) {
  return {
    id: t.id,
    household_id: hid,
    date: t.date,
    type: t.type,
    amount: t.amount,
    category_id: t.categoryId,
    cost_type: t.costType ?? null,
    payment_method: t.paymentMethod,
    card_name: t.cardName ?? null,
    memo: t.memo ?? null,
    receipt_data_url: t.receiptDataUrl ?? null,
    recurring_id: t.recurringId ?? null,
    created_at: t.createdAt,
  };
}


const s = (v: unknown) => String(v ?? "");
const ns = (v: unknown) => (v != null ? String(v) : undefined);

function rowToTx(r: Record<string, unknown>): Transaction {
  return {
    id: s(r.id), date: s(r.date),
    type: s(r.type) as Transaction["type"],
    amount: Number(r.amount),
    categoryId: s(r.category_id),
    costType: ns(r.cost_type) as Transaction["costType"],
    paymentMethod: s(r.payment_method) as Transaction["paymentMethod"],
    cardName: ns(r.card_name), memo: ns(r.memo),
    receiptDataUrl: ns(r.receipt_data_url), recurringId: ns(r.recurring_id),
    createdAt: s(r.created_at),
  };
}

function rowToCat(r: Record<string, unknown>): Category {
  return { id: s(r.id), name: s(r.name), type: s(r.type) as Category["type"], color: s(r.color) };
}

function rowToRule(r: Record<string, unknown>): RecurringRule {
  return {
    id: s(r.id),
    name: s(r.name),
    dayOfMonth: Number(r.day_of_month),
    type: s(r.type) as RecurringRule["type"],
    amount: Number(r.amount),
    categoryId: s(r.category_id),
    costType: ns(r.cost_type) as RecurringRule["costType"],
    paymentMethod: s(r.payment_method) as RecurringRule["paymentMethod"],
    cardName: ns(r.card_name), memo: ns(r.memo),
    active: Boolean(r.active),
    startMonth: s(r.start_month),
    generatedMonths: Array.isArray(r.generated_months) ? (r.generated_months as string[]) : [],
    createdAt: s(r.created_at),
  };
}

// ── load ────────────────────────────────────────────────────────────────────

export async function dbLoad(householdId: string): Promise<AppData> {
  const sb = supabase!;

  const [txRes, catRes, budRes, recRes, cardRes] = await Promise.all([
    sb.from("transactions").select("*").eq("household_id", householdId).order("date", { ascending: false }),
    sb.from("categories").select("*").eq("household_id", householdId),
    sb.from("budgets").select("*").eq("household_id", householdId),
    sb.from("recurring_rules").select("*").eq("household_id", householdId),
    sb.from("household_cards").select("*").eq("household_id", householdId).order("sort_order"),
  ]);

  const categories: Category[] = catRes.data?.map(rowToCat) ?? [];
  const cards: string[] = cardRes.data?.map((r) => r.name) ?? [];

  // 新しい世帯: デフォルトカテゴリ・カードを挿入
  if (categories.length === 0) {
    await Promise.all([
      sb.from("categories").insert(
        DEFAULT_CATEGORIES.map((c) => ({ ...c, household_id: householdId }))
      ),
      sb.from("household_cards").insert(
        DEFAULT_CARDS.map((name, i) => ({ household_id: householdId, name, sort_order: i }))
      ),
    ]);
    return {
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      budgets: [],
      recurring: [],
      cards: DEFAULT_CARDS,
      version: 2,
    };
  }

  return {
    transactions: txRes.data?.map(rowToTx) ?? [],
    categories,
    budgets:
      budRes.data?.map((r) => ({
        categoryId: r.category_id,
        amount: Number(r.amount),
      })) ?? [],
    recurring: recRes.data?.map(rowToRule) ?? [],
    cards,
    version: 2,
  };
}

// ── transactions ─────────────────────────────────────────────────────────────

export async function dbAddTransaction(t: Transaction, hid: string) {
  await supabase!.from("transactions").insert(txRow(t, hid));
}

export async function dbUpdateTransaction(t: Transaction, hid: string) {
  await supabase!.from("transactions").update(txRow(t, hid)).eq("id", t.id);
}

export async function dbDeleteTransaction(id: string) {
  await supabase!.from("transactions").delete().eq("id", id);
}

export async function dbBulkInsertTransactions(txs: Transaction[], hid: string) {
  if (txs.length === 0) return;
  await supabase!.from("transactions").insert(txs.map((t) => txRow(t, hid)));
}

// ── categories ───────────────────────────────────────────────────────────────

export async function dbAddCategory(c: Category, hid: string) {
  await supabase!.from("categories").insert({ ...c, household_id: hid });
}

export async function dbUpdateCategory(c: Category, hid: string) {
  await supabase!.from("categories").update({ ...c, household_id: hid }).eq("id", c.id);
}

export async function dbDeleteCategory(id: string) {
  await supabase!.from("categories").delete().eq("id", id);
  await supabase!.from("budgets").delete().eq("category_id", id);
}

export async function dbBulkInsertCategories(cats: Category[], hid: string) {
  if (cats.length === 0) return;
  await supabase!.from("categories").insert(cats.map((c) => ({ ...c, household_id: hid })));
}

// ── budgets ───────────────────────────────────────────────────────────────────

export async function dbSetBudget(b: Budget, hid: string) {
  await supabase!
    .from("budgets")
    .upsert({ household_id: hid, category_id: b.categoryId, amount: b.amount });
}

export async function dbRemoveBudget(categoryId: string, hid: string) {
  await supabase!.from("budgets").delete().eq("household_id", hid).eq("category_id", categoryId);
}

// ── recurring ────────────────────────────────────────────────────────────────

function ruleRow(r: RecurringRule, hid: string) {
  return {
    id: r.id,
    household_id: hid,
    name: r.name,
    day_of_month: r.dayOfMonth,
    type: r.type,
    amount: r.amount,
    category_id: r.categoryId,
    cost_type: r.costType ?? null,
    payment_method: r.paymentMethod,
    card_name: r.cardName ?? null,
    memo: r.memo ?? null,
    active: r.active,
    start_month: r.startMonth,
    generated_months: r.generatedMonths,
    created_at: r.createdAt,
  };
}

export async function dbAddRecurring(r: RecurringRule, hid: string) {
  await supabase!.from("recurring_rules").insert(ruleRow(r, hid));
}

export async function dbUpdateRecurring(r: RecurringRule, hid: string) {
  await supabase!.from("recurring_rules").update(ruleRow(r, hid)).eq("id", r.id);
}

export async function dbDeleteRecurring(id: string) {
  await supabase!.from("recurring_rules").delete().eq("id", id);
}

// ── cards ─────────────────────────────────────────────────────────────────────

export async function dbAddCard(name: string, hid: string, order: number) {
  await supabase!.from("household_cards").insert({ household_id: hid, name, sort_order: order });
}

export async function dbRemoveCard(name: string, hid: string) {
  await supabase!.from("household_cards").delete().eq("household_id", hid).eq("name", name);
}

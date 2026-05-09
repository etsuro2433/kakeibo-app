"use client";

import { AppData } from "./types";
import { INITIAL_DATA } from "./defaults";

const STORAGE_KEY = "kakeibo:data:v1";

export function loadData(): AppData {
  if (typeof window === "undefined") return INITIAL_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DATA;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ...INITIAL_DATA,
      ...parsed,
      categories: parsed.categories?.length ? parsed.categories : INITIAL_DATA.categories,
      cards: parsed.cards ?? INITIAL_DATA.cards,
      transactions: parsed.transactions ?? [],
      budgets: parsed.budgets ?? [],
    };
  } catch {
    return INITIAL_DATA;
  }
}

export function saveData(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

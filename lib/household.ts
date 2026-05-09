"use client";

const KEY = "kakeibo:household_id";

export function getHouseholdId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function setHouseholdId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, id.trim());
}

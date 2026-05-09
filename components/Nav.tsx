"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "ダッシュボード" },
  { href: "/transactions", label: "取引" },
  { href: "/cards", label: "クレカ・固定費" },
  { href: "/budgets", label: "予算" },
  { href: "/settings", label: "設定" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
        <Link href="/" className="text-lg font-bold text-brand-700 mr-4">
          家計簿
        </Link>
        <nav className="flex gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={classNames(
                  "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/types";

export function CategoryFilter() {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get("category");

  function href(cat: string | null) {
    const p = new URLSearchParams(params.toString());
    if (cat) p.set("category", cat);
    else p.delete("category");
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const chip = (label: string, value: string | null) => {
    const isActive = (value ?? "") === (active ?? "");
    return (
      <Link
        key={value ?? "all"}
        href={href(value)}
        className={
          "rounded-full px-3.5 py-1.5 text-[12px] font-mono uppercase tracking-[0.14em] transition border " +
          (isActive
            ? "bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 border-transparent"
            : "border-ink-200 dark:border-ink-800 text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100 hover:border-ink-400 dark:hover:border-ink-600")
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {chip("All", null)}
      {CATEGORIES.map((c) => chip(CATEGORY_LABELS[c], c))}
    </div>
  );
}

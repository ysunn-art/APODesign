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
          "rounded-full px-3 py-1 text-sm border transition " +
          (isActive
            ? "bg-brand text-white border-brand"
            : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800")
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {chip("All", null)}
      {CATEGORIES.map((c) => chip(CATEGORY_LABELS[c], c))}
    </div>
  );
}

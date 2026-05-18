"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Submission } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/format";

export function ModerationList({ initial }: { initial: Submission[] }) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function act(id: string, action: "approve" | "reject") {
    startTransition(async () => {
      try {
        const res = await fetch("/api/moderation", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission_id: id, action }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Failed");
        }
        setItems((prev) => prev.filter((s) => s.id !== id));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  if (items.length === 0) {
    return <p className="text-neutral-500">Queue is empty.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {items.map((s) => (
        <article
          key={s.id}
          className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 grid sm:grid-cols-[200px_1fr_auto] gap-4 items-start bg-white dark:bg-neutral-900"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image_url} alt={s.title} className="w-full h-32 object-cover rounded" />
          <div>
            <div className="text-xs text-neutral-500 mb-1">
              {CATEGORY_LABELS[s.category]} · {timeAgo(s.created_at)} · conf {(s.ai_confidence ?? 0).toFixed(2)}
            </div>
            <Link href={`/submission/${s.id}`} className="font-semibold hover:underline">
              {s.title}
            </Link>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">{s.description}</p>
            {s.roast_text && <p className="text-xs italic text-neutral-500 mt-1 line-clamp-2">{s.roast_text}</p>}
          </div>
          <div className="flex flex-col gap-2 min-w-[120px]">
            <button
              onClick={() => act(s.id, "approve")}
              disabled={pending}
              className="rounded bg-green-600 text-white text-sm py-1.5 hover:bg-green-700 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              onClick={() => act(s.id, "reject")}
              disabled={pending}
              className="rounded bg-red-600 text-white text-sm py-1.5 hover:bg-red-700 disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

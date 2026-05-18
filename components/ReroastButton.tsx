"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ReroastButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/submissions/${submissionId}/reroast`, {
          method: "POST",
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Re-roast failed");
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Re-roast failed");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 px-3.5 py-1.5 text-[12px] font-medium hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
      >
        {pending ? "Re-running…" : "Re-run AI roast"}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}

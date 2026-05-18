"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  submissionId: string;
  redirectTo?: string;
  onDeleted?: () => void;
  label?: string;
  compact?: boolean;
}

export function DeleteButton({
  submissionId,
  redirectTo,
  onDeleted,
  label = "Delete",
  compact = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!window.confirm("Delete this submission? This can't be undone.")) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/submissions/${submissionId}`, { method: "DELETE" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Delete failed");
        }
        if (onDeleted) onDeleted();
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  const base = compact
    ? "text-xs text-red-600 hover:underline disabled:opacity-60"
    : "rounded-md border border-red-600 text-red-600 px-3 py-1.5 text-sm hover:bg-red-600 hover:text-white disabled:opacity-60";

  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={onClick} disabled={pending} className={base}>
        {pending ? "Deleting…" : `🗑 ${label}`}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

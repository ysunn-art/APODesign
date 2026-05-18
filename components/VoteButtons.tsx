"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  submissionId: string;
  initialScore: number;
  initialUserValue: -1 | 0 | 1;
  authed: boolean;
}

export function VoteButtons({ submissionId, initialScore, initialUserValue, authed }: Props) {
  const [score, setScore] = useState(initialScore);
  const [userValue, setUserValue] = useState<-1 | 0 | 1>(initialUserValue);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function cast(next: -1 | 1) {
    if (!authed) {
      setError("Sign in to vote");
      return;
    }
    const target = userValue === next ? 0 : next;
    const optimisticScore = score - userValue + target;
    setUserValue(target as -1 | 0 | 1);
    setScore(optimisticScore);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/votes", {
          method: target === 0 ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission_id: submissionId, value: target }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Vote failed");
        }
        router.refresh();
      } catch (err) {
        // rollback
        setUserValue(initialUserValue);
        setScore(initialScore);
        setError(err instanceof Error ? err.message : "Vote failed");
      }
    });
  }

  const btn = (dir: -1 | 1, label: string) => (
    <button
      onClick={() => cast(dir)}
      disabled={pending}
      aria-pressed={userValue === dir}
      className={
        "px-2 py-1 rounded text-sm border transition " +
        (userValue === dir
          ? "bg-brand text-white border-brand"
          : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800")
      }
    >
      {label}
    </button>
  );

  return (
    <div className="inline-flex items-center gap-2">
      {btn(1, "▲")}
      <span className="font-semibold w-8 text-center">{score}</span>
      {btn(-1, "▼")}
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </div>
  );
}

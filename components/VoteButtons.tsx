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

  const btn = (dir: -1 | 1, path: string, label: string) => {
    const isActive = userValue === dir;
    const accent =
      dir === 1
        ? "text-accent border-accent/40 hover:bg-accent/10"
        : "text-red-600 border-red-500/40 hover:bg-red-500/10 dark:text-red-400";
    return (
      <button
        onClick={() => cast(dir)}
        disabled={pending}
        aria-pressed={isActive}
        aria-label={label}
        className={
          "inline-flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-[0.94] disabled:opacity-60 " +
          (isActive
            ? dir === 1
              ? "bg-accent text-accent-ink border-accent"
              : "bg-red-600 text-white border-red-600"
            : `border-ink-200 dark:border-ink-800 text-ink-500 dark:text-ink-400 ${accent}`)
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={path} />
        </svg>
      </button>
    );
  };

  return (
    <div className="inline-flex items-center gap-3">
      {btn(1, "M6 15l6-6 6 6", "Upvote")}
      <span className="font-mono tabular-nums text-lg w-10 text-center text-ink-900 dark:text-ink-50">
        {score >= 0 ? `+${score}` : score}
      </span>
      {btn(-1, "M6 9l6 6 6-6", "Downvote")}
      {error && <span className="text-xs text-red-600 dark:text-red-400 ml-2">{error}</span>}
    </div>
  );
}

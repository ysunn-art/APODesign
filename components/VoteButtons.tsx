"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface Props {
  submissionId: string;
  initialScore: number;
  initialUserValue: -1 | 0 | 1;
  authed: boolean;
  isOwner?: boolean;
}

export function VoteButtons({
  submissionId,
  initialScore,
  initialUserValue,
  authed,
  isOwner = false,
}: Props) {
  // Score is always sourced from DB via realtime — no optimistic override
  const [score, setScore] = useState(initialScore);
  const [voted, setVoted] = useState(initialUserValue === 1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Keep score in sync with DB in real time
  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`votes:${submissionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "submissions",
          filter: `id=eq.${submissionId}`,
        },
        (payload) => {
          const newScore = (payload.new as { vote_score: number }).vote_score;
          if (typeof newScore === "number") setScore(newScore);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [submissionId]);

  async function handleVote() {
    if (!authed) { setError("Sign in to vote"); return; }
    if (voted) return; // one-time only — cannot cancel

    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission_id: submissionId, value: 1 }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Vote failed");
        }
        // Mark as voted — permanent, no toggle
        setVoted(true);
        // Let realtime update the score; also refresh server cache after trigger propagates
        setTimeout(() => router.refresh(), 800);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Vote failed");
      }
    });
  }

  if (isOwner) {
    return (
      <div className="inline-flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-ink-200 dark:border-ink-800 px-5 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-400" aria-hidden>
            <path d="M6 15l6-6 6 6" />
          </svg>
          <span className="font-mono tabular-nums text-base font-semibold text-ink-900 dark:text-ink-50">
            {score}
          </span>
          <span className="text-xs text-ink-500 dark:text-ink-400">
            {score === 1 ? "vote" : "votes"} · your submission
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleVote}
        disabled={pending || voted}
        aria-pressed={voted}
        aria-label={voted ? "Already voted" : "Vote for 拉完了"}
        className={
          "group inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm font-medium transition-all active:scale-[0.96] " +
          (voted
            ? "bg-accent text-white border border-accent cursor-not-allowed opacity-90"
            : pending
            ? "border border-ink-200 dark:border-ink-700 text-ink-400 opacity-60 cursor-wait"
            : "border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-200 hover:border-accent hover:text-accent hover:bg-accent/5")
        }
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={voted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${!voted && !pending ? "group-hover:-translate-y-0.5" : ""}`}
          aria-hidden
        >
          <path d="M6 15l6-6 6 6" />
        </svg>

        <span>
          {voted ? "已投票 ✓" : pending ? "Voting…" : "Vote for 拉完了"}
        </span>

        {/* Live count from DB */}
        <span
          className={
            "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-mono text-xs tabular-nums font-bold transition-all " +
            (voted
              ? "bg-white/20 text-white"
              : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200")
          }
        >
          {score}
        </span>
      </button>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 pl-1">{error}</p>
      )}
    </div>
  );
}

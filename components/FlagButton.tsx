"use client";

import { useState, useTransition } from "react";

export function FlagButton({ submissionId, authed }: { submissionId: string; authed: boolean }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!authed) {
      setError("Sign in to flag");
      return;
    }
    const reason = window.prompt("Why are you flagging this submission?", "");
    if (reason == null) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/flags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission_id: submissionId, reason }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Flag failed");
        }
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Flag failed");
      }
    });
  }

  if (done) return <span className="text-xs text-neutral-500">Flagged for review</span>;
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="text-xs text-neutral-500 hover:text-red-600 disabled:opacity-60"
      title="Report this submission"
    >
      {error ? error : "🚩 Flag"}
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/format";

export interface CommentRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  username: string | null;
}

interface Props {
  submissionId: string;
  initial: CommentRow[];
  authed: boolean;
}

export function CommentList({ submissionId, initial, authed }: Props) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!authed) {
      setError("Sign in to comment");
      return;
    }
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission_id: submissionId, body }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Comment failed");
        setComments((prev) => [...prev, j.comment]);
        setBody("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Comment failed");
      }
    });
  }

  return (
    <section className="space-y-4">
      <h2 className="font-semibold">Comments ({comments.length})</h2>

      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder={authed ? "Add your roast…" : "Sign in to comment"}
          disabled={!authed || pending}
          className="block w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            type="submit"
            disabled={!authed || pending || !body.trim()}
            className="ml-auto rounded-md bg-brand text-white px-3 py-1.5 text-sm hover:bg-brand-dark disabled:opacity-60"
          >
            Post
          </button>
        </div>
      </form>

      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {comments.map((c) => (
          <li key={c.id} className="py-3">
            <div className="text-xs text-neutral-500 mb-1">
              {c.username ?? "anon"} · {timeAgo(c.created_at)}
            </div>
            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

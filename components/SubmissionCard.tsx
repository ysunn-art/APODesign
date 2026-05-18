import Link from "next/link";
import type { Submission } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { scoreEmoji, timeAgo } from "@/lib/format";

export function SubmissionCard({ s }: { s: Submission }) {
  return (
    <Link
      href={`/submission/${s.id}`}
      className="block rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 hover:shadow-md transition"
    >
      <div className="aspect-video bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.image_url}
          alt={s.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1 text-xs text-neutral-500">
          <span>{CATEGORY_LABELS[s.category]}</span>
          <span>{timeAgo(s.created_at)}</span>
        </div>
        <h3 className="font-semibold leading-tight line-clamp-2">{s.title}</h3>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span>{scoreEmoji(s.poop_score)} {s.poop_score ?? "?"}/10</span>
          <span className="text-neutral-500">▲ {s.vote_score}</span>
        </div>
      </div>
    </Link>
  );
}

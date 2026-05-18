import Link from "next/link";
import type { Submission } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/format";

interface Props {
  s: Submission;
  index?: number;
}

export function SubmissionCard({ s, index = 0 }: Props) {
  return (
    <Link
      href={`/submission/${s.id}`}
      className="group block"
      style={{
        animation: "card-in 600ms cubic-bezier(0.16,1,0.3,1) backwards",
        animationDelay: `${Math.min(index * 60, 600)}ms`,
      }}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-ink-100 dark:bg-ink-900 ring-1 ring-inset ring-ink-200/60 dark:ring-ink-800/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.image_url}
          alt={s.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
        />
        <ScoreChip score={s.poop_score} />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-3 eyebrow">
          <span>{CATEGORY_LABELS[s.category]}</span>
          <span className="h-px w-3 bg-ink-300 dark:bg-ink-700" />
          <span>{timeAgo(s.created_at)}</span>
        </div>
        <h3 className="text-lg font-medium tracking-tight leading-snug text-ink-900 dark:text-ink-50 line-clamp-2 group-hover:text-accent transition-colors">
          {s.title}
        </h3>
        <div className="flex items-center justify-between pt-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500 dark:text-ink-400">
            {s.vote_score} {Math.abs(s.vote_score) === 1 ? "vote" : "votes"}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500 dark:text-ink-400">
            №&nbsp;{(index + 1).toString().padStart(3, "0")}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes card-in {
          from { opacity: 0; transform: translate3d(0, 12px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </Link>
  );
}

function ScoreChip({ score }: { score: number | null }) {
  if (score == null) return null;
  return (
    <div className="absolute bottom-3 left-3 inline-flex items-baseline gap-1 rounded-full bg-ink-950/75 backdrop-blur px-3 py-1.5 text-ink-50">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">Score</span>
      <span className="font-mono text-sm tabular-nums">{score}</span>
      <span className="font-mono text-[10px] text-ink-400">/10</span>
    </div>
  );
}

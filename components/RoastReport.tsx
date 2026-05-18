import type { Submission } from "@/lib/types";
import { scoreEmoji } from "@/lib/format";

export function RoastReport({ s }: { s: Submission }) {
  if (s.poop_score == null) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-4 text-sm text-neutral-500">
        Roast report not available yet. This submission is awaiting AI analysis or moderator review.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Design Roast Report</h2>
        <span className="text-lg">
          {scoreEmoji(s.poop_score)} {s.poop_score}/10
        </span>
      </div>
      {s.roast_text && <p className="text-sm leading-relaxed">{s.roast_text}</p>}
      {s.heuristics_violated && s.heuristics_violated.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Heuristics violated</h3>
          <ul className="flex flex-wrap gap-1.5">
            {s.heuristics_violated.map((h) => (
              <li
                key={h}
                className="text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5"
              >
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.fix_suggestion && (
        <div>
          <h3 className="text-xs uppercase tracking-wide text-neutral-500 mb-1">How to fix it</h3>
          <p className="text-sm">{s.fix_suggestion}</p>
        </div>
      )}
    </div>
  );
}

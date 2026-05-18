import type { Submission } from "@/lib/types";

export function RoastReport({ s }: { s: Submission }) {
  if (s.poop_score == null) {
    return (
      <aside className="border-t border-ink-200 dark:border-ink-800 pt-6">
        <p className="eyebrow mb-2">Roast pending</p>
        <p className="text-sm text-ink-500 dark:text-ink-400 leading-relaxed">
          Awaiting AI analysis or moderator review. This report will populate automatically once the
          submission is processed.
        </p>
      </aside>
    );
  }

  return (
    <aside className="border-t border-ink-200 dark:border-ink-800 pt-6 space-y-6">
      <header>
        <p className="eyebrow mb-3">Design Roast Report</p>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-5xl tabular-nums tracking-tightest text-ink-900 dark:text-ink-50">
            {s.poop_score}
          </span>
          <span className="font-mono text-sm uppercase tracking-[0.16em] text-ink-500 dark:text-ink-400">
            / 10 violation severity
          </span>
        </div>
      </header>

      {s.roast_text && (
        <p className="text-[15px] leading-relaxed text-ink-700 dark:text-ink-200 max-w-[55ch]">
          {s.roast_text}
        </p>
      )}

      {s.heuristics_violated && s.heuristics_violated.length > 0 && (
        <section>
          <p className="eyebrow mb-3">Heuristics violated</p>
          <ul className="divide-y divide-ink-200 dark:divide-ink-800 border-y border-ink-200 dark:border-ink-800">
            {s.heuristics_violated.map((h, i) => (
              <li
                key={h}
                className="flex items-baseline gap-4 py-2.5 text-sm text-ink-700 dark:text-ink-200"
              >
                <span className="font-mono text-[11px] tabular-nums text-ink-400 dark:text-ink-500 w-6">
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.fix_suggestion && (
        <section>
          <p className="eyebrow mb-2">How to fix it</p>
          <p className="text-[15px] leading-relaxed text-ink-700 dark:text-ink-200 max-w-[55ch]">
            {s.fix_suggestion}
          </p>
        </section>
      )}

      {s.ai_confidence != null && (
        <footer className="flex items-center gap-3 pt-2 border-t border-ink-200 dark:border-ink-800">
          <span className="eyebrow">AI confidence</span>
          <span className="font-mono text-xs tabular-nums text-ink-700 dark:text-ink-200">
            {(s.ai_confidence * 100).toFixed(0)}%
          </span>
        </footer>
      )}
    </aside>
  );
}

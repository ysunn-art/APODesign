import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/types";
import type { Submission } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard — A Piece of Design" };

type Period = "weekly" | "monthly";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period: Period = searchParams.period === "monthly" ? "monthly" : "weekly";
  const days = period === "weekly" ? 7 : 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "approved")
    .gte("created_at", cutoff)
    .order("vote_score", { ascending: false })
    .limit(10);

  const top: Submission[] = (data as Submission[]) || [];

  const tab = (key: Period, label: string) => (
    <Link
      href={`/leaderboard?period=${key}`}
      className={
        "px-4 py-1.5 rounded-full text-[12px] font-mono uppercase tracking-[0.14em] border transition " +
        (period === key
          ? "bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 border-transparent"
          : "border-ink-200 dark:border-ink-800 text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100")
      }
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-5xl md:text-6xl font-medium tracking-tightest leading-[0.95] text-ink-900 dark:text-ink-50 mb-3">
          🏆 Leaderboard
        </h1>
        <p className="text-ink-500 dark:text-ink-400">
          Top voted bad design from the past {days} days.
        </p>
      </header>

      <div className="flex gap-2">
        {tab("weekly", "This week")}
        {tab("monthly", "This month")}
      </div>

      {top.length === 0 ? (
        <div className="border-y border-ink-200 dark:border-ink-800 py-16 text-center">
          <p className="eyebrow mb-2">No results yet</p>
          <p className="text-xl font-medium text-ink-900 dark:text-ink-50">
            Nothing has been crowned yet.
          </p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Vote on the gallery first.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-ink-100 dark:divide-ink-900">
          {top.map((s, i) => (
            <Link
              key={s.id}
              href={`/submission/${s.id}`}
              className="group grid grid-cols-[auto_1fr] gap-6 py-6 items-center hover:bg-ink-50 dark:hover:bg-ink-950 -mx-6 px-6 transition-colors rounded-xl"
            >
              {/* Rank */}
              <div className="w-10 text-center font-mono text-2xl font-bold text-ink-300 dark:text-ink-700 select-none">
                {i + 1}
              </div>

              <div className="grid sm:grid-cols-[120px_1fr] gap-4 items-center min-w-0">
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-900 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image_url}
                    alt={s.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  {s.poop_score != null && (
                    <div className="absolute bottom-1.5 left-1.5 inline-flex items-baseline gap-0.5 rounded-full bg-ink-950/75 backdrop-blur px-2 py-0.5 text-ink-50">
                      <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-300">Score</span>
                      <span className="font-mono text-[11px] tabular-nums">{s.poop_score}</span>
                      <span className="font-mono text-[8px] text-ink-400">/10</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="eyebrow mb-1.5 flex items-center gap-2">
                    <span>{CATEGORY_LABELS[s.category]}</span>
                    <span className="h-px w-3 bg-ink-300 dark:bg-ink-700" />
                    <span>{timeAgo(s.created_at)}</span>
                  </div>
                  <h2 className="text-lg font-medium tracking-tight text-ink-900 dark:text-ink-50 group-hover:text-accent transition-colors line-clamp-1">
                    {s.title}
                  </h2>
                  {s.roast_text && (
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-400 line-clamp-2 leading-relaxed">
                      {s.roast_text}
                    </p>
                  )}
                  <span className="mt-2 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400 dark:text-ink-500">
                    {s.vote_score} {Math.abs(s.vote_score) === 1 ? "vote" : "votes"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

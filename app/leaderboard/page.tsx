import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { SubmissionCard } from "@/components/SubmissionCard";
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
    <div>
      <h1 className="text-3xl font-bold mb-2">🏆 Leaderboard</h1>
      <p className="text-neutral-500 mb-6">Top voted bad design from the past {days} days.</p>
      <div className="flex gap-2 mb-6">
        {tab("weekly", "This week")}
        {tab("monthly", "This month")}
      </div>
      {top.length === 0 ? (
        <p className="text-neutral-500">Nothing has been crowned yet — vote on the gallery first.</p>
      ) : (
        <ol className="space-y-3">
          {top.map((s, i) => (
            <li key={s.id} className="flex items-stretch gap-4">
              <div className="text-3xl font-bold w-10 text-center text-neutral-400">{i + 1}</div>
              <div className="flex-1">
                <SubmissionCard s={s} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

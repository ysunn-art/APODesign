import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import type { Submission } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "GIX Hall of Famous — A Piece of Design" };

export default async function HallOfFamePage() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "approved")
    .eq("category", "gix")
    .order("vote_score", { ascending: false })
    .limit(30);

  const top: Submission[] = (data as Submission[]) || [];

  return (
    <div className="space-y-12">
      <header className="space-y-5">
        <span className="eyebrow">GIX · Internal bad design collection</span>
        <h1 className="text-5xl md:text-7xl font-medium tracking-tightest leading-[0.95] text-ink-900 dark:text-ink-50 max-w-[16ch]">
          GIX Hall of <span className="italic text-ink-400 dark:text-ink-500">Famous</span>.
        </h1>
        <p className="text-base leading-relaxed text-ink-600 dark:text-ink-400 max-w-[55ch]">
          The worst design crimes spotted across the GIX program — submitted, roasted, and voted
          on by the cohort. Famous, just not in the way anyone intended.
        </p>
      </header>

      {top.length === 0 ? (
        <div className="border-y border-ink-200 dark:border-ink-800 py-20 text-center">
          <p className="eyebrow mb-3">No inductees yet</p>
          <p className="text-2xl md:text-3xl font-medium tracking-tight text-ink-900 dark:text-ink-50">
            The collection is empty.
          </p>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
            Submit a bad design with category <strong>GIX</strong> to get it inducted.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-ink-100 dark:divide-ink-900">
          {top.map((s, i) => (
            <GixCard key={s.id} s={s} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function GixCard({ s, rank }: { s: Submission; rank: number }) {
  return (
    <Link
      href={`/submission/${s.id}`}
      className="group grid grid-cols-[auto_1fr] gap-6 py-8 items-start hover:bg-ink-50 dark:hover:bg-ink-950 -mx-6 px-6 transition-colors rounded-xl"
    >
      {/* Rank */}
      <div className="w-10 pt-1 text-right font-mono text-[11px] uppercase tracking-[0.16em] text-ink-300 dark:text-ink-700 select-none">
        {rank.toString().padStart(3, "0")}
      </div>

      <div className="grid sm:grid-cols-[200px_1fr] gap-6 items-start min-w-0">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-900 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.image_url}
            alt={s.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          {s.poop_score != null && (
            <div className="absolute bottom-2 left-2 inline-flex items-baseline gap-1 rounded-full bg-ink-950/75 backdrop-blur px-2.5 py-1 text-ink-50">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-300">Score</span>
              <span className="font-mono text-xs tabular-nums">{s.poop_score}</span>
              <span className="font-mono text-[9px] text-ink-400">/10</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-2 min-w-0 pt-1">
          <div className="flex items-center gap-3 eyebrow">
            <span>{timeAgo(s.created_at)}</span>
            {(s as Submission & { author?: string | null }).author && (
              <>
                <span className="h-px w-3 bg-ink-300 dark:bg-ink-700" />
                <span className="truncate">{(s as Submission & { author?: string | null }).author}</span>
              </>
            )}
          </div>

          <h2 className="text-xl font-medium tracking-tight leading-snug text-ink-900 dark:text-ink-50 group-hover:text-accent transition-colors line-clamp-2">
            {s.title}
          </h2>

          {s.roast_text && (
            <p className="text-sm leading-relaxed text-ink-500 dark:text-ink-400 line-clamp-3">
              {s.roast_text}
            </p>
          )}

          <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400 dark:text-ink-500">
            {s.vote_score} {Math.abs(s.vote_score) === 1 ? "vote" : "votes"}
          </span>
        </div>
      </div>
    </Link>
  );
}

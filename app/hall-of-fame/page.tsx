import { getServerSupabase } from "@/lib/supabase/server";
import { SubmissionCard } from "@/components/SubmissionCard";
import type { Submission } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hall of Famous — A Piece of Design" };

export default async function HallOfFamePage() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "approved")
    .order("vote_score", { ascending: false })
    .limit(30);

  const top: Submission[] = (data as Submission[]) || [];

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <span className="eyebrow">All time · Permanent collection</span>
        <h1 className="text-5xl md:text-7xl font-medium tracking-tightest leading-[0.95] text-ink-900 dark:text-ink-50 max-w-[14ch]">
          Hall of <span className="italic text-ink-400 dark:text-ink-500">Famous</span>.
        </h1>
        <p className="text-base leading-relaxed text-ink-600 dark:text-ink-400 max-w-[55ch]">
          Designs that achieved a level of infamy so durable, the community has voted them into
          the permanent collection. Famous, just not in the way anyone intended.
        </p>
      </header>

      {top.length === 0 ? (
        <div className="border-y border-ink-200 dark:border-ink-800 py-20 text-center">
          <p className="eyebrow mb-3">No inductees yet</p>
          <p className="text-2xl md:text-3xl font-medium tracking-tight text-ink-900 dark:text-ink-50">
            The collection is empty.
          </p>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
            Vote on the gallery first — the worst-voted designs get inducted automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {top.map((s, i) => (
            <SubmissionCard key={s.id} s={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

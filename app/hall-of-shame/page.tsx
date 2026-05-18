import { getServerSupabase } from "@/lib/supabase/server";
import { SubmissionCard } from "@/components/SubmissionCard";
import type { Submission } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hall of Shame — A Piece of Design" };

export default async function HallOfShamePage() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "approved")
    .order("vote_score", { ascending: false })
    .limit(30);

  const top: Submission[] = (data as Submission[]) || [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">💀 Hall of Shame</h1>
      <p className="text-neutral-500 mb-6">The worst of the worst, all time.</p>
      {top.length === 0 ? (
        <p className="text-neutral-500">No inductees yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {top.map((s) => (
            <SubmissionCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

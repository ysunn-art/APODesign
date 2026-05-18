import { getServerSupabase } from "@/lib/supabase/server";
import { SubmissionCard } from "@/components/SubmissionCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CATEGORIES, type Category, type Submission } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = { category?: string; sort?: string };

export default async function GalleryPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = getServerSupabase();
  const sort = searchParams.sort === "score" ? "vote_score" : "created_at";

  let query = supabase
    .from("submissions")
    .select("*")
    .eq("status", "approved")
    .order(sort, { ascending: false })
    .limit(60);

  if (searchParams.category && (CATEGORIES as readonly string[]).includes(searchParams.category)) {
    query = query.eq("category", searchParams.category as Category);
  }

  const { data, error } = await query;
  const submissions: Submission[] = (data as Submission[]) || [];

  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold mb-1">A Piece of Design 💩</h1>
        <p className="text-neutral-500">
          Real-world bad design, scored and roasted by AI. Vote on what deserves a trophy.
        </p>
      </section>

      <CategoryFilter />

      <div className="flex items-center gap-3 mb-4 text-sm">
        <span className="text-neutral-500">Sort:</span>
        <a
          href={`?${new URLSearchParams({ ...(searchParams as Record<string, string>), sort: "new" }).toString()}`}
          className={"hover:underline " + (sort === "created_at" ? "font-semibold" : "")}
        >
          Newest
        </a>
        <a
          href={`?${new URLSearchParams({ ...(searchParams as Record<string, string>), sort: "score" }).toString()}`}
          className={"hover:underline " + (sort === "vote_score" ? "font-semibold" : "")}
        >
          Top voted
        </a>
      </div>

      {error && <p className="text-red-600 text-sm">{error.message}</p>}

      {submissions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((s) => (
            <SubmissionCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center text-neutral-500">
      <p className="text-lg mb-1">No approved submissions yet.</p>
      <p className="text-sm">Be the first — hit Submit in the header.</p>
    </div>
  );
}

import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { SubmissionCard } from "@/components/SubmissionCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { LiveSubmissions } from "@/components/LiveSubmissions";
import { DesignTicker } from "@/components/DesignTicker";
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
  const [hero, ...rest] = submissions;

  const sortHref = (s: "new" | "score") => {
    const p = new URLSearchParams(searchParams as Record<string, string>);
    if (s === "score") p.set("sort", "score");
    else p.delete("sort");
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <span className="eyebrow">Issue 001 · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <LiveSubmissions />
          </div>
          <h1 className="text-5xl md:text-7xl font-medium tracking-tightest leading-[0.95] text-ink-900 dark:text-ink-50">
            The bad design
            <br />
            <span className="text-ink-400 dark:text-ink-500">awards, in real time.</span>
          </h1>
        </div>
        <p className="text-base leading-relaxed text-ink-600 dark:text-ink-400 max-w-[52ch]">
          A community-judged ledger of the worst interfaces, signage, packaging and
          architecture in circulation. Every submission is graded against Nielsen&apos;s
          ten heuristics by an LLM, then voted on by readers.
        </p>
      </section>

      <DesignTicker />

      <section className="flex flex-wrap items-center justify-between gap-y-4">
        <CategoryFilter />
        <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 dark:border-ink-800 p-1 text-[12px] font-mono uppercase tracking-[0.14em]">
          <SortPill href={sortHref("new")} active={sort === "created_at"}>
            Newest
          </SortPill>
          <SortPill href={sortHref("score")} active={sort === "vote_score"}>
            Top voted
          </SortPill>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
      )}

      {submissions.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="space-y-10">
          {hero && (
            <Link
              href={`/submission/${hero.id}`}
              className="group grid lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-12 items-center"
            >
              <div className="relative overflow-hidden rounded-bento bg-ink-100 dark:bg-ink-900 aspect-[4/3] lg:aspect-[16/10]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.image_url}
                  alt={hero.title}
                  className="w-full h-full object-cover transition duration-700 group-hover:scale-[1.02]"
                  loading="eager"
                />
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-ink-950/70 backdrop-blur px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-50">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Featured
                </div>
              </div>
              <div>
                <div className="eyebrow mb-3">
                  Score · <span className="font-sans font-medium text-ink-700 dark:text-ink-200">{hero.poop_score ?? "—"}/10</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-medium tracking-tight leading-[1.05] text-ink-900 dark:text-ink-50 group-hover:text-accent transition-colors">
                  {hero.title}
                </h2>
                {hero.roast_text && (
                  <p className="mt-4 text-[15px] leading-relaxed text-ink-600 dark:text-ink-400 line-clamp-4">
                    {hero.roast_text}
                  </p>
                )}
                <div className="mt-6 flex items-center gap-4 text-[12px] font-mono uppercase tracking-[0.16em] text-ink-500 dark:text-ink-400">
                  <span>{hero.vote_score} votes</span>
                  <span className="h-px w-6 bg-ink-300 dark:bg-ink-700" />
                  <span>Read the roast →</span>
                </div>
              </div>
            </Link>
          )}

          {rest.length > 0 && (
            <>
              <div className="flex items-center gap-4">
                <span className="eyebrow">The ledger</span>
                <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500 dark:text-ink-400">
                  {rest.length} entries
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {rest.map((s, i) => (
                  <SubmissionCard key={s.id} s={s} index={i} />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function SortPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "px-3 py-1 rounded-full transition " +
        (active
          ? "bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900"
          : "text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100")
      }
    >
      {children}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="border-y border-ink-200 dark:border-ink-800 py-20 text-center">
      <p className="eyebrow mb-3">Awaiting submissions</p>
      <p className="text-2xl md:text-3xl font-medium tracking-tight text-ink-900 dark:text-ink-50">
        The gallery is empty.
      </p>
      <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
        Be the first contributor — hit Submit in the header.
      </p>
    </div>
  );
}

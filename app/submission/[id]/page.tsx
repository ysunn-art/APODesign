import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { RoastReport } from "@/components/RoastReport";
import { VoteButtons } from "@/components/VoteButtons";
import { CommentList, type CommentRow } from "@/components/CommentList";
import { FlagButton } from "@/components/FlagButton";
import { DeleteButton } from "@/components/DeleteButton";
import { CATEGORY_LABELS, type Submission } from "@/lib/types";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubmissionPage({ params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!submission) notFound();
  const s = submission as Submission;

  const { data: viewerProfile } = user
    ? await supabase.from("users").select("is_moderator").eq("id", user.id).maybeSingle()
    : { data: null };
  const canDelete = !!user && (user.id === s.user_id || !!viewerProfile?.is_moderator);

  const [{ data: commentsRaw }, { data: voteRow }, { data: author }] = await Promise.all([
    supabase
      .from("comments")
      .select("id, user_id, body, created_at, users:user_id(username)")
      .eq("submission_id", s.id)
      .order("created_at", { ascending: true }),
    user
      ? supabase
          .from("votes")
          .select("value")
          .eq("submission_id", s.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("users").select("username, avatar_url").eq("id", s.user_id).maybeSingle(),
  ]);

  const comments: CommentRow[] = (commentsRaw || []).map(
    (c: {
      id: string;
      user_id: string;
      body: string;
      created_at: string;
      users: { username: string | null } | { username: string | null }[] | null;
    }) => {
      const u = Array.isArray(c.users) ? c.users[0] : c.users;
      return {
        id: c.id,
        user_id: c.user_id,
        body: c.body,
        created_at: c.created_at,
        username: u?.username ?? null,
      };
    }
  );

  const userValue: -1 | 0 | 1 = (voteRow?.value ?? 0) as -1 | 0 | 1;

  return (
    <article className="space-y-12">
      <header className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 eyebrow hover:text-ink-900 dark:hover:text-ink-100 transition"
        >
          <span>←</span>
          <span>Back to gallery</span>
        </Link>
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-10 lg:items-end">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 eyebrow">
              <span>{CATEGORY_LABELS[s.category]}</span>
              <span className="h-px w-4 bg-ink-300 dark:bg-ink-700" />
              <span>@{author?.username ?? "anon"}</span>
              <span className="h-px w-4 bg-ink-300 dark:bg-ink-700" />
              <span>{timeAgo(s.created_at)}</span>
              {s.status !== "approved" && (
                <span className="rounded-full border border-amber-500/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 normal-case tracking-normal text-[11px] font-medium">
                  {s.status}
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-medium tracking-tightest leading-[0.98] text-ink-900 dark:text-ink-50 max-w-[18ch]">
              {s.title}
            </h1>
          </div>
        </div>
      </header>

      <section className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          <figure className="overflow-hidden rounded-bento bg-ink-100 dark:bg-ink-900 ring-1 ring-inset ring-ink-200/60 dark:ring-ink-800/80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.image_url}
              alt={s.title}
              className="w-full max-h-[720px] object-contain bg-ink-100 dark:bg-ink-900"
            />
          </figure>

          {s.description && (
            <div className="prose-spacing">
              <p className="eyebrow mb-3">Submitter&apos;s note</p>
              <p className="text-[15px] leading-relaxed text-ink-700 dark:text-ink-200 max-w-[60ch] whitespace-pre-wrap">
                {s.description}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-5 border-y border-ink-200 dark:border-ink-800 py-4">
            <VoteButtons
              submissionId={s.id}
              initialScore={s.vote_score}
              initialUserValue={userValue}
              authed={!!user}
              isOwner={!!user && user.id === s.user_id}
            />
            <span className="h-5 w-px bg-ink-200 dark:bg-ink-800" />
            <FlagButton submissionId={s.id} authed={!!user} />
            {canDelete && (
              <>
                <span className="h-5 w-px bg-ink-200 dark:bg-ink-800" />
                <DeleteButton submissionId={s.id} redirectTo="/" compact />
              </>
            )}
          </div>

          <CommentList submissionId={s.id} initial={comments} authed={!!user} />
        </div>

        <RoastReport s={s} canReroast={canDelete} />
      </section>
    </article>
  );
}

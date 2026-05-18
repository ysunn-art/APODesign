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

  const comments: CommentRow[] = (commentsRaw || []).map((c: {
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
  });

  const userValue: -1 | 0 | 1 = (voteRow?.value ?? 0) as -1 | 0 | 1;

  return (
    <article className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image_url} alt={s.title} className="w-full max-h-[600px] object-contain bg-neutral-100 dark:bg-neutral-800" />
        </div>
        <div>
          <div className="text-xs text-neutral-500 mb-1 flex items-center gap-2">
            <span>{CATEGORY_LABELS[s.category]}</span>
            <span>·</span>
            <span>{author?.username ?? "anon"}</span>
            <span>·</span>
            <span>{timeAgo(s.created_at)}</span>
            {s.status !== "approved" && (
              <span className="ml-2 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5">
                {s.status}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{s.title}</h1>
          {s.description && <p className="mt-2 text-sm whitespace-pre-wrap">{s.description}</p>}
        </div>

        <div className="flex items-center gap-4">
          <VoteButtons
            submissionId={s.id}
            initialScore={s.vote_score}
            initialUserValue={userValue}
            authed={!!user}
          />
          <FlagButton submissionId={s.id} authed={!!user} />
          {canDelete && <DeleteButton submissionId={s.id} redirectTo="/" compact />}
          <Link href="/" className="text-sm text-neutral-500 hover:underline ml-auto">
            ← Back to gallery
          </Link>
        </div>

        <CommentList submissionId={s.id} initial={comments} authed={!!user} />
      </div>
      <aside>
        <RoastReport s={s} />
      </aside>
    </article>
  );
}

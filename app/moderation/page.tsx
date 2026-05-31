import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { ModerationList } from "./ModerationList";
import type { Submission } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation — A Piece of Design" };

export default async function ModerationPage() {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("users")
    .select("is_moderator")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_moderator) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Moderator access required</h1>
        <p className="text-neutral-500">
          Ask an admin to flip <code>users.is_moderator = true</code> for your account in Supabase.
        </p>
      </div>
    );
  }

  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  const pending: Submission[] = (data as Submission[]) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">🛡️ Moderation Queue</h1>
        <Link
          href="/moderation/import"
          className="inline-flex items-center gap-2 rounded-full border border-ink-200 dark:border-ink-800 px-4 py-2 text-sm font-medium hover:bg-ink-100 dark:hover:bg-ink-900 transition"
        >
          📄 Import from PDF
        </Link>
      </div>
      <p className="text-neutral-500 mb-6">{pending.length} submission(s) awaiting review.</p>
      <ModerationList initial={pending} />
    </div>
  );
}

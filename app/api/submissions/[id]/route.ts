import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = getAdminSupabase();

  const { data: submission, error: fetchErr } = await admin
    .from("submissions")
    .select("id, user_id, image_url")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let isModerator = false;
  if (submission.user_id !== user.id) {
    const { data: profile } = await admin
      .from("users")
      .select("is_moderator")
      .eq("id", user.id)
      .maybeSingle();
    isModerator = !!profile?.is_moderator;
    if (!isModerator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Best-effort: also remove the storage object. URL shape:
  //   https://<host>/storage/v1/object/public/submissions/<path>
  const marker = "/storage/v1/object/public/submissions/";
  const idx = submission.image_url.indexOf(marker);
  if (idx >= 0) {
    const path = submission.image_url.slice(idx + marker.length);
    if (path) {
      await admin.storage.from("submissions").remove([path]);
    }
  }

  const { error: delErr } = await admin
    .from("submissions")
    .delete()
    .eq("id", params.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

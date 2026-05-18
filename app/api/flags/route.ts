import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const submissionId = String(body.submission_id || "");
  const reason = String(body.reason || "").slice(0, 500);
  if (!submissionId) return NextResponse.json({ error: "submission_id required" }, { status: 400 });

  const { error } = await supabase
    .from("flags")
    .upsert(
      { user_id: user.id, submission_id: submissionId, reason },
      { onConflict: "user_id,submission_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

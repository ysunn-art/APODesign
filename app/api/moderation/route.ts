import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("is_moderator")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_moderator)
    return NextResponse.json({ error: "Moderator role required" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const submissionId = String(body.submission_id || "");
  const action = String(body.action || "");
  if (!submissionId) return NextResponse.json({ error: "submission_id required" }, { status: 400 });
  if (action !== "approve" && action !== "reject")
    return NextResponse.json({ error: "action must be approve|reject" }, { status: 400 });

  const status = action === "approve" ? "approved" : "rejected";
  const { error } = await supabase
    .from("submissions")
    .update({ status })
    .eq("id", submissionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status });
}

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
  const text = String(body.body || "").trim();
  if (!submissionId) return NextResponse.json({ error: "submission_id required" }, { status: 400 });
  if (text.length < 1 || text.length > 2000)
    return NextResponse.json({ error: "Comment must be 1–2000 chars" }, { status: 400 });

  const insert = await supabase
    .from("comments")
    .insert({ user_id: user.id, submission_id: submissionId, body: text })
    .select("id, user_id, body, created_at, users:user_id(username)")
    .single();
  if (insert.error || !insert.data)
    return NextResponse.json({ error: insert.error?.message || "Insert failed" }, { status: 500 });

  const u = Array.isArray(insert.data.users) ? insert.data.users[0] : insert.data.users;
  return NextResponse.json({
    comment: {
      id: insert.data.id,
      user_id: insert.data.user_id,
      body: insert.data.body,
      created_at: insert.data.created_at,
      username: u?.username ?? null,
    },
  });
}

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { generateRoastReport, statusFromRoast } from "@/lib/ai/roast";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/submissions/[id]/reroast
 *
 * Re-runs the AI roast pipeline for an existing submission. Allowed for
 * the submission's owner OR any moderator. Useful when the original
 * Groq call failed (network, image fetch, transient model errors).
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const admin = getAdminSupabase();
  const { data: submission, error: fetchErr } = await admin
    .from("submissions")
    .select("id, user_id, image_url, title, description")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (submission.user_id !== user.id) {
    const { data: profile } = await admin
      .from("users")
      .select("is_moderator")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_moderator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Fetch the image bytes ourselves (no Groq cross-host fetch needed).
  let dataUrl: string;
  try {
    const res = await fetch(submission.image_url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    dataUrl = `data:${contentType};base64,${buf.toString("base64")}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[reroast] image fetch failed", params.id, msg);
    return NextResponse.json({ error: `Could not fetch image: ${msg}` }, { status: 502 });
  }

  try {
    const report = await generateRoastReport(
      { url: dataUrl },
      `${submission.title}\n${submission.description}`
    );
    const status = statusFromRoast(report);
    const update = await admin
      .from("submissions")
      .update({
        poop_score: report.poop_score,
        heuristics_violated: report.heuristics_violated,
        roast_text: report.roast_text,
        fix_suggestion: report.fix_suggestion,
        ai_confidence: report.confidence,
        status,
      })
      .eq("id", params.id)
      .select("*")
      .single();
    if (update.error)
      return NextResponse.json({ error: update.error.message }, { status: 500 });
    return NextResponse.json({ submission: update.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[reroast] failed", params.id, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

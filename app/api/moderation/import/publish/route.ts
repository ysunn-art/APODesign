import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { CATEGORIES, type EditedDraft } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_moderator")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_moderator) {
    return NextResponse.json({ error: "Moderator role required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.drafts) || body.drafts.length === 0) {
    return NextResponse.json({ error: "drafts array is required" }, { status: 400 });
  }
  const drafts: EditedDraft[] = body.drafts;

  const MAX_DRAFTS = 20;
  if (drafts.length > MAX_DRAFTS) {
    return NextResponse.json(
      { error: `Too many drafts: maximum ${MAX_DRAFTS} per request` },
      { status: 400 }
    );
  }

  const admin = getAdminSupabase();
  let published = 0;
  const errors: string[] = [];

  for (const draft of drafts) {
    try {
      if (!draft.imageBase64.startsWith("data:image/png;base64,")) {
        throw new Error("imageBase64 must be a PNG data URL");
      }
      if (!draft.title || typeof draft.title !== "string" || draft.title.length > 140) {
        throw new Error("Invalid title (required, ≤140 chars)");
      }
      if (!CATEGORIES.includes(draft.category)) {
        throw new Error(`Invalid category: ${draft.category}`);
      }
      if (typeof draft.poop_score !== "number" || draft.poop_score < 1 || draft.poop_score > 10) {
        throw new Error("poop_score must be 1–10");
      }
      if (!Array.isArray(draft.heuristics_violated)) {
        throw new Error("heuristics_violated must be an array");
      }

      // Strip the data URL prefix to get raw base64
      const base64Data = draft.imageBase64.split(",")[1];
      if (!base64Data) throw new Error("Invalid imageBase64");
      const bytes = Buffer.from(base64Data, "base64");

      // Upload image to Supabase Storage
      const objectPath = `${user.id}/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await admin.storage
        .from("submissions")
        .upload(objectPath, bytes, { contentType: "image/png", upsert: false });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: pub } = admin.storage
        .from("submissions")
        .getPublicUrl(objectPath);

      // Insert as approved — moderator already reviewed
      const { error: insertError } = await admin.from("submissions").insert({
        user_id: user.id,
        image_url: pub.publicUrl,
        title: draft.title,
        description: "",
        category: draft.category,
        status: "approved",
        poop_score: draft.poop_score,
        heuristics_violated: draft.heuristics_violated,
        roast_text: draft.roast_text,
        fix_suggestion: draft.fix_suggestion,
        ai_confidence: draft.confidence,
      });
      if (insertError) {
        // Clean up the orphaned Storage object to avoid leaking publicly-accessible files
        await admin.storage.from("submissions").remove([objectPath]).catch(() => {});
        throw new Error(`Insert failed: ${insertError.message}`);
      }

      published++;
    } catch (err) {
      console.error("[publish] failed for page", draft.pageNumber, err);
      errors.push(
        `Page ${draft.pageNumber}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return NextResponse.json({ published, errors });
}

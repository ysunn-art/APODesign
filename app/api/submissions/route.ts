import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { generateRoastReport, statusFromRoast } from "@/lib/ai/roast";
import { CATEGORIES, type Category } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("image");
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();
  const category = String(form.get("category") || "") as Category;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image exceeds 10MB" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG/PNG/WebP/GIF images allowed" }, { status: 400 });
  }
  if (!title || title.length > 140) {
    return NextResponse.json({ error: "Title is required (≤140 chars)" }, { status: 400 });
  }
  if (description.length > 2000) {
    return NextResponse.json({ error: "Description too long" }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Upload image
  const admin = getAdminSupabase();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : file.type.split("/")[1];
  const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const upload = await admin.storage
    .from("submissions")
    .upload(objectPath, bytes, { contentType: file.type, upsert: false });
  if (upload.error) {
    return NextResponse.json({ error: `Upload failed: ${upload.error.message}` }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("submissions").getPublicUrl(objectPath);
  const imageUrl = pub.publicUrl;

  // Insert pending row
  const insert = await admin
    .from("submissions")
    .insert({
      user_id: user.id,
      image_url: imageUrl,
      title,
      description,
      category,
      status: "pending",
    })
    .select("*")
    .single();
  if (insert.error || !insert.data) {
    return NextResponse.json({ error: `Insert failed: ${insert.error?.message}` }, { status: 500 });
  }

  // Run AI roast (best effort — failure leaves row in pending state).
  // Send the image inline as a base64 data URL so Groq never has to fetch
  // it from a public host (some hosts return 403 to server-to-server fetches).
  const dataUrl = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;
  let roastError: string | null = null;
  try {
    const report = await generateRoastReport({ url: dataUrl }, `${title}\n${description}`);
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
      .eq("id", insert.data.id)
      .select("*")
      .single();
    if (update.error) {
      roastError = update.error.message;
    } else {
      return NextResponse.json({ submission: update.data });
    }
  } catch (err) {
    roastError = err instanceof Error ? err.message : String(err);
    // Surface in Vercel logs so we can debug failures.
    console.error("[roast] failed for submission", insert.data.id, roastError);
  }

  return NextResponse.json({
    submission: insert.data,
    warning: `Roast failed: ${roastError}. Submission saved as pending.`,
  });
}

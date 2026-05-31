import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { extractPdfPages } from "@/lib/pdf/extract";
import { generateRoastReport } from "@/lib/ai/roast";
import type { Category, DraftSubmission } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// NOTE: 60s may be tight for 20 pages (rendering + 20 serial Groq calls).
// Consider raising to 300 on a Pro Vercel plan.
export const maxDuration = 60;

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

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

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "PDF exceeds 20MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let pages: string[];
  try {
    pages = await extractPdfPages(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `PDF processing failed: ${msg}` }, { status: 400 });
  }

  if (pages.length === 0) {
    return NextResponse.json({ error: "No pages found in PDF" }, { status: 400 });
  }

  const drafts: DraftSubmission[] = [];

  for (let i = 0; i < pages.length; i++) {
    const imageBase64 = pages[i];
    const pageNumber = i + 1;
    try {
      const report = await generateRoastReport(
        { url: imageBase64 },
        `PDF import — page ${pageNumber}`
      );
      drafts.push({
        pageNumber,
        imageBase64,
        title: `Page ${pageNumber}`,
        category: "other" as Category,
        poop_score: report.poop_score,
        heuristics_violated: report.heuristics_violated,
        roast_text: report.roast_text,
        fix_suggestion: report.fix_suggestion,
        confidence: report.confidence,
        should_moderate: report.should_moderate,
      });
    } catch (err) {
      console.error("[import] roast failed for page", pageNumber, err);
      // Surface as a zero-confidence draft so moderator can skip or fill manually.
      drafts.push({
        pageNumber,
        imageBase64,
        title: `Page ${pageNumber}`,
        category: "other" as Category,
        poop_score: 1,
        heuristics_violated: [],
        roast_text: "AI processing failed for this page.",
        fix_suggestion: "",
        confidence: 0,
        should_moderate: true,
      });
    }
  }

  return NextResponse.json({ drafts });
}

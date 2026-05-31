# PDF Bulk Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-step wizard at `/moderation/import` that lets moderators upload a PDF, extracts each page as an image via AI roast pipeline, and lets the moderator edit and selectively publish results as `status: 'approved'` submissions.

**Architecture:** The PDF is uploaded to a Next.js API route which renders each page to PNG base64 using `pdfjs-dist` (legacy Node.js build) + `canvas` (Node.js canvas polyfill). Each page is passed to the existing `generateRoastReport()` from `lib/ai/roast.ts`. The client wizard shows editable draft cards; on publish, a second API route uploads images to Supabase Storage and inserts rows directly as `approved`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `pdfjs-dist` (PDF page rendering), `canvas` npm package (Node.js canvas API), existing Supabase + Groq pipeline.

---

## File Map

**Create:**
- `lib/pdf/extract.ts` — `validatePdfConstraints()` + `extractPdfPages()` → base64 PNG array
- `app/api/moderation/import/route.ts` — POST: receive PDF → extract pages → AI roast each → return `DraftSubmission[]`
- `app/api/moderation/import/publish/route.ts` — POST: receive edited drafts → upload to Storage → insert as `approved`
- `app/moderation/import/page.tsx` — 3-step wizard (upload / processing / review+publish)
- `tests/pdf-extract.test.ts` — unit tests for `validatePdfConstraints`

**Modify:**
- `lib/types.ts` — add `DraftSubmission`, `EditedDraft`
- `app/moderation/page.tsx` — add "Import from PDF" link for moderators
- `package.json` — add `pdfjs-dist`, `canvas`

---

## Task 1: Install dependencies and add types

**Files:**
- Modify: `package.json`
- Modify: `lib/types.ts`

- [ ] **Step 1: Install PDF rendering packages**

```bash
npm install pdfjs-dist canvas
```

Expected: both packages added to `node_modules`, no peer-dep errors.

- [ ] **Step 2: Add DraftSubmission and EditedDraft to lib/types.ts**

Open `lib/types.ts`. After the closing `}` of the existing `RoastReport` interface (line 47), append:

```typescript
export interface DraftSubmission {
  pageNumber: number;
  imageBase64: string;          // data:image/png;base64,...
  title: string;
  category: Category;
  poop_score: number;
  heuristics_violated: string[];
  roast_text: string;
  fix_suggestion: string;
  confidence: number;
  should_moderate: boolean;
}

// Same shape as DraftSubmission. Alias makes publish-route intent explicit.
export type EditedDraft = DraftSubmission;
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/types.ts
git commit -m "feat: add DraftSubmission types and pdfjs-dist/canvas deps"
```

---

## Task 2: PDF extraction utility

**Files:**
- Create: `lib/pdf/extract.ts`
- Create: `tests/pdf-extract.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/pdf-extract.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePdfConstraints } from "@/lib/pdf/extract";

test("validatePdfConstraints: throws when buffer exceeds 20MB", () => {
  const big = Buffer.alloc(21 * 1024 * 1024);
  assert.throws(
    () => validatePdfConstraints(big),
    /exceeds 20MB/
  );
});

test("validatePdfConstraints: accepts buffer under 20MB", () => {
  const small = Buffer.alloc(1024);
  assert.doesNotThrow(() => validatePdfConstraints(small));
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '@/lib/pdf/extract'` or similar.

- [ ] **Step 3: Create lib/pdf/extract.ts**

Create `lib/pdf/extract.ts`:

```typescript
import { createCanvas } from "canvas";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_PAGES = 20;
const RENDER_SCALE = 1.5;

export function validatePdfConstraints(buffer: Buffer): void {
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("PDF exceeds 20MB limit");
  }
}

export async function extractPdfPages(
  buffer: Buffer,
  maxPages = MAX_PAGES
): Promise<string[]> {
  validatePdfConstraints(buffer);

  // Dynamic import keeps Next.js from bundling this ESM module into the client.
  // The legacy build disables the worker automatically in Node.js environments.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "";

  const pdf = await pdfjs
    .getDocument({ data: new Uint8Array(buffer) })
    .promise;

  const pageCount = Math.min(pdf.numPages, maxPages);
  const results: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(
      Math.round(viewport.width),
      Math.round(viewport.height)
    );
    const ctx = canvas.getContext("2d");

    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    results.push(canvas.toDataURL("image/png"));
    page.cleanup();
  }

  pdf.destroy();
  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: the two `validatePdfConstraints` tests PASS. (Other tests also pass.)

- [ ] **Step 5: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors. If `pdfjs-dist` types cause issues, add `"skipLibCheck": true` to `tsconfig.json` under `compilerOptions`.

- [ ] **Step 6: Commit**

```bash
git add lib/pdf/extract.ts tests/pdf-extract.test.ts
git commit -m "feat: add PDF page extraction utility"
```

---

## Task 3: Import API route

**Files:**
- Create: `app/api/moderation/import/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/moderation/import/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { extractPdfPages } from "@/lib/pdf/extract";
import { generateRoastReport } from "@/lib/ai/roast";
import type { Category, DraftSubmission } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    } catch {
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
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/moderation/import/route.ts
git commit -m "feat: add PDF import API route"
```

---

## Task 4: Publish API route

**Files:**
- Create: `app/api/moderation/import/publish/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/moderation/import/publish/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { EditedDraft } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const admin = getAdminSupabase();
  let published = 0;
  const errors: string[] = [];

  for (const draft of drafts) {
    try {
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
      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

      published++;
    } catch (err) {
      errors.push(
        `Page ${draft.pageNumber}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return NextResponse.json({ published, errors });
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/moderation/import/publish/route.ts
git commit -m "feat: add PDF import publish API route"
```

---

## Task 5: Wizard UI

**Files:**
- Create: `app/moderation/import/page.tsx`

- [ ] **Step 1: Create the wizard page**

Create `app/moderation/import/page.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type DraftSubmission,
} from "@/lib/types";

type Step = "upload" | "processing" | "review";

interface EditState {
  draft: DraftSubmission;
  selected: boolean;
}

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [edits, setEdits] = useState<EditState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<{
    published: number;
    errors: string[];
  } | null>(null);
  const [publishing, setPublishing] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
  }

  async function handleProcess() {
    if (!file) return;
    setError(null);
    setStep("processing");

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/moderation/import", {
      method: "POST",
      body: form,
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Processing failed");
      setStep("upload");
      return;
    }

    const drafts: DraftSubmission[] = data.drafts;
    setEdits(
      drafts.map((d) => ({
        draft: d,
        selected: d.confidence >= 0.4,
      }))
    );
    setStep("review");
  }

  function updateDraft(index: number, patch: Partial<DraftSubmission>) {
    setEdits((prev) =>
      prev.map((e, i) =>
        i === index ? { ...e, draft: { ...e.draft, ...patch } } : e
      )
    );
  }

  function toggleSelect(index: number) {
    setEdits((prev) =>
      prev.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e))
    );
  }

  function selectAll() {
    setEdits((prev) => prev.map((e) => ({ ...e, selected: true })));
  }

  async function handlePublish() {
    const approved = edits.filter((e) => e.selected).map((e) => e.draft);
    if (approved.length === 0) return;
    setPublishing(true);
    setError(null);

    const res = await fetch("/api/moderation/import/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drafts: approved }),
    });
    const data = await res.json();
    setPublishResult(data);
    setPublishing(false);
  }

  const selectedCount = edits.filter((e) => e.selected).length;

  // Step indicator shared across steps
  const STEPS: { id: Step; label: string }[] = [
    { id: "upload", label: "Upload" },
    { id: "processing", label: "Processing" },
    { id: "review", label: "Review & Publish" },
  ];

  const StepBar = ({ active }: { active: Step }) => (
    <div className="flex items-center gap-1 mb-8 font-mono text-[11px] uppercase tracking-[0.14em]">
      {STEPS.map(({ id, label }, i) => (
        <div key={id} className="flex items-center gap-1">
          <span
            className={`px-3 py-1 rounded-full ${
              id === active
                ? "bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900"
                : "text-ink-400 dark:text-ink-500"
            }`}
          >
            {i + 1}. {label}
          </span>
          {i < STEPS.length - 1 && (
            <span className="h-px w-4 bg-ink-200 dark:bg-ink-800" />
          )}
        </div>
      ))}
    </div>
  );

  // ── Success screen ────────────────────────────────────────────────────
  if (publishResult) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="eyebrow mb-3">Done</p>
        <h1 className="text-4xl font-medium tracking-tight text-ink-900 dark:text-ink-50 mb-4">
          {publishResult.published} submission{publishResult.published !== 1 ? "s" : ""} published
        </h1>
        {publishResult.errors.length > 0 && (
          <div className="text-left text-sm text-red-600 dark:text-red-400 mb-6 border border-red-200 dark:border-red-900 rounded-xl p-4">
            <p className="font-medium mb-1">
              {publishResult.errors.length} failed:
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {publishResult.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 px-5 py-2 text-sm font-medium hover:opacity-90 transition"
        >
          View Gallery →
        </button>
      </div>
    );
  }

  // ── Upload step ───────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="max-w-xl mx-auto py-10">
        <StepBar active="upload" />
        <h1 className="text-3xl font-medium tracking-tight text-ink-900 dark:text-ink-50 mb-2">
          Import from PDF
        </h1>
        <p className="text-ink-500 dark:text-ink-400 mb-8">
          Upload a PDF to extract each page as a design submission. Max 20 pages · 20 MB.
        </p>

        <div
          className="border-2 border-dashed border-ink-300 dark:border-ink-700 rounded-bento p-12 text-center cursor-pointer hover:border-ink-600 dark:hover:border-ink-400 transition"
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-4xl mb-3">📄</div>
          <p className="font-medium text-ink-900 dark:text-ink-50 mb-1">
            {file ? file.name : "Drop your PDF here"}
          </p>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
              : "or click to browse · PDF only"}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleProcess}
            disabled={!file}
            className="inline-flex items-center gap-2 rounded-full bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 px-5 py-2 text-sm font-medium disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition"
          >
            Process PDF →
          </button>
        </div>
      </div>
    );
  }

  // ── Processing step ───────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="max-w-xl mx-auto py-10">
        <StepBar active="processing" />
        <div className="text-center py-16">
          <p className="eyebrow mb-6">Analyzing designs</p>
          <div className="h-1.5 w-full rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden mb-4">
            <div className="h-full rounded-full bg-ink-900 dark:bg-ink-50 animate-pulse w-1/2" />
          </div>
          <p className="text-sm font-mono text-ink-500 dark:text-ink-400">
            Running AI roast pipeline…
          </p>
        </div>
      </div>
    );
  }

  // ── Review step ───────────────────────────────────────────────────────
  return (
    <div className="py-10">
      <StepBar active="review" />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-ink-900 dark:text-ink-50">
            Review Drafts
          </h1>
          <p className="text-ink-500 dark:text-ink-400 mt-1 font-mono text-[12px] uppercase tracking-[0.12em]">
            {edits.length} pages · {selectedCount} selected
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="text-[13px] px-4 py-2 rounded-full border border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-900 transition"
          >
            Select All
          </button>
          <button
            onClick={handlePublish}
            disabled={selectedCount === 0 || publishing}
            className="inline-flex items-center gap-2 rounded-full bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 px-5 py-2 text-sm font-medium disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition"
          >
            {publishing ? "Publishing…" : `Publish Selected (${selectedCount})`}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-6 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="space-y-4">
        {edits.map((e, i) => {
          const isLowConfidence = e.draft.confidence < 0.4;
          return (
            <div
              key={i}
              className={`border rounded-bento p-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 transition-colors ${
                e.selected
                  ? "border-ink-900 dark:border-ink-100"
                  : "border-ink-200 dark:border-ink-800 opacity-50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={e.draft.imageBase64}
                alt={`Page ${e.draft.pageNumber}`}
                className="w-full aspect-[4/3] object-cover rounded-xl bg-ink-100 dark:bg-ink-900"
              />
              <div className="flex flex-col gap-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={e.selected}
                      onChange={() => toggleSelect(i)}
                      className="w-4 h-4"
                    />
                    <span
                      className={`text-[10px] font-mono uppercase tracking-[0.14em] px-2.5 py-1 rounded-full ${
                        isLowConfidence
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}
                    >
                      {isLowConfidence
                        ? `⚠ Confidence ${e.draft.confidence.toFixed(2)} — likely not a design`
                        : `✓ Confidence ${e.draft.confidence.toFixed(2)}`}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-ink-500 dark:text-ink-400">
                    Score {e.draft.poop_score}/10
                  </span>
                </div>

                {/* Title */}
                <input
                  className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-500"
                  placeholder="Title"
                  value={e.draft.title}
                  onChange={(ev) => updateDraft(i, { title: ev.target.value })}
                />

                {/* Category + Score row */}
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-500"
                    value={e.draft.category}
                    onChange={(ev) =>
                      updateDraft(i, { category: ev.target.value as Category })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="w-16 rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-ink-500"
                    value={e.draft.poop_score}
                    onChange={(ev) =>
                      updateDraft(i, { poop_score: Number(ev.target.value) })
                    }
                  />
                </div>

                {/* Roast text */}
                <textarea
                  className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ink-500"
                  rows={3}
                  placeholder="Roast text"
                  value={e.draft.roast_text}
                  onChange={(ev) =>
                    updateDraft(i, { roast_text: ev.target.value })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/moderation/import/page.tsx
git commit -m "feat: add PDF import wizard UI"
```

---

## Task 6: Wire navigation

**Files:**
- Modify: `app/moderation/page.tsx`

- [ ] **Step 1: Add Import PDF link**

Open `app/moderation/page.tsx`. The file already imports `Link` — if not, add `import Link from "next/link";` at the top.

Find this block (around line 42):
```tsx
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">🛡️ Moderation Queue</h1>
      <p className="text-neutral-500 mb-6">{pending.length} submission(s) awaiting review.</p>
      <ModerationList initial={pending} />
    </div>
  );
```

Replace with:
```tsx
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
```

- [ ] **Step 2: Add missing Link import if needed**

Check if `Link` is already imported. If not, add at the top:
```typescript
import Link from "next/link";
```

- [ ] **Step 3: Verify typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/moderation/page.tsx
git commit -m "feat: add Import from PDF link to moderation page"
```

---

## Task 7: Smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000` and sign in with a moderator account (an account with `is_moderator = true` in Supabase).

- [ ] **Step 2: Verify link appears on /moderation**

Go to `http://localhost:3000/moderation`. Confirm the "📄 Import from PDF" button appears in the header row.

- [ ] **Step 3: Navigate to wizard**

Click "Import from PDF". Confirm:
- Step 1 (Upload) renders with the drop zone
- File input opens on click
- "Process PDF →" button is disabled until a file is chosen

- [ ] **Step 4: Upload a test PDF**

Find any PDF file (even a text document works for testing the pipeline). Upload it and click "Process PDF →". Confirm:
- Processing screen appears with the animated bar
- Review screen appears after processing finishes
- Each page has an image thumbnail, editable title/category/score/roast fields
- Pages with confidence < 0.4 show the red ⚠ badge and are unchecked by default

- [ ] **Step 5: Edit and publish**

Change a title on one card, select it, click "Publish Selected (1)". Confirm success screen shows. Navigate to the gallery and confirm the new submission appears.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete PDF bulk import feature"
```

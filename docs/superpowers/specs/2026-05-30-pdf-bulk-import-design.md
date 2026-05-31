# PDF Bulk Import — Design Spec

**Date:** 2026-05-30  
**Feature:** Admin PDF bulk import with AI analysis and moderator review  
**Status:** Approved

---

## Overview

Moderators can upload a PDF containing up to 20 pages of bad design. The server renders each page as an image, runs the existing AI roast pipeline on each one, and returns a batch of draft submissions. The moderator reviews, edits AI-generated fields (title, category, poop score, roast text), selects which drafts to publish, and submits. Selected drafts are uploaded to Supabase Storage and inserted directly as `status: 'approved'` submissions, bypassing the normal moderation queue.

---

## Constraints

- Restricted to users with `is_moderator = true` (existing role, no new role needed)
- Max 20 pages per PDF upload
- Max PDF file size: 20MB
- Small batch (5–20 designs) — synchronous processing, no background queue needed
- One PDF page = one submission (variable PDF formats handled by letting moderator reject non-design pages)

---

## New Files

```
app/moderation/import/page.tsx            — 3-step wizard UI (client component)
app/api/moderation/import/route.ts        — POST: PDF → extract pages → AI roast → return drafts
app/api/moderation/import/publish/route.ts — POST: edited drafts → upload images → insert to DB
```

---

## Data Flow

### Step 1 — PDF Processing (`POST /api/moderation/import`)

1. Validate `is_moderator = true`
2. Validate file is PDF, page count ≤ 20, size ≤ 20MB
3. Render each page to PNG base64 using `pdfjs-dist`
4. For each page, call `generateRoastReport()` from `lib/ai/roast.ts` sequentially
5. Return `{ drafts: DraftSubmission[] }`

### Step 2 — Moderator Review (client-side)

The wizard auto-advances to the review step when processing completes. The moderator sees one card per page with:
- Page image preview
- Confidence badge (green ≥ 0.7, red < 0.4 — flagged "likely not a design")
- Editable fields: title, category, poop score, roast text
- Checkbox to include/exclude from publish (low-confidence pages unchecked by default)

### Step 3 — Publish (`POST /api/moderation/import/publish`)

1. Validate `is_moderator = true`
2. For each approved draft:
   - Upload base64 image to Supabase Storage under `{user_id}/{uuid}.png`
   - Insert `submissions` row with `status: 'approved'` (skips moderation queue since moderator already reviewed)
3. Return `{ published: number, errors: string[] }`

---

## New Types

```typescript
// Addition to lib/types.ts

export interface DraftSubmission {
  pageNumber: number;
  imageBase64: string;          // data:image/png;base64,...
  title: string;                // default: "Page N"
  category: Category;           // default: "other"
  poop_score: number;
  heuristics_violated: string[];
  roast_text: string;
  fix_suggestion: string;
  confidence: number;
  should_moderate: boolean;
}

// EditedDraft = DraftSubmission with user edits applied.
// Same shape — the publish endpoint receives the full draft (including imageBase64)
// so it can upload the image to Supabase Storage.
export type EditedDraft = DraftSubmission;
```

---

## Wizard UI — `/moderation/import`

Three steps shown via a step indicator at the top:

### Step 1 — Upload
- PDF drop zone with file input fallback
- Constraint labels: "max 20 pages · PDF only"
- "Process PDF →" button (disabled until file selected)

### Step 2 — Processing
- Progress bar: "Page N of M · Roasting with AI…"
- Auto-advances to Step 3 on completion

### Step 3 — Review & Edit
- Toolbar: page count summary, "Select All", "Publish Selected (N)" button
- One card per page:
  - Thumbnail image (left)
  - Checkbox + confidence badge
  - Editable: title (text input), category (select), poop score (number 1–10), roast text (textarea)
- Low-confidence pages (< 0.4): flagged red, unchecked by default
- Unchecked cards are skipped on publish

---

## API Routes

### `POST /api/moderation/import`

| | |
|---|---|
| Auth | `is_moderator = true` |
| Content-Type | `multipart/form-data` |
| Body | `file`: PDF |
| Success | `200 { drafts: DraftSubmission[] }` |
| Errors | `400` invalid file / too many pages, `401` unauth, `403` not moderator, `500` parse error |
| Timeout | 60s (`maxDuration = 60`) |

PDF parse error → `400` with message shown on Step 1. AI failure on individual page → draft gets `confidence: 0`, `roast_text: "AI processing failed"`, flagged red; moderator can edit manually or skip.

### `POST /api/moderation/import/publish`

| | |
|---|---|
| Auth | `is_moderator = true` |
| Content-Type | `application/json` |
| Body | `{ drafts: EditedDraft[] }` (only checked/approved drafts) |
| Success | `200 { published: number, errors: string[] }` |
| Errors | `401`, `403`, `500` |

Image upload failure for one draft → added to `errors[]`, rest continue publishing. UI shows partial-success summary.

---

## Error Handling Summary

| Scenario | Behavior |
|---|---|
| Invalid PDF / wrong file type | `400` on Step 1, clear error message |
| PDF > 20 pages | `400` on Step 1 |
| AI fails on a page | Draft flagged red, editable, skippable |
| Image upload fails on publish | That draft in `errors[]`, rest publish |
| Not authenticated | `401` redirect |
| Not moderator | `403`, existing "Moderator access required" UI pattern |

---

## Dependencies

- `pdfjs-dist` — pure-JS PDF rendering, no system binaries required (works on Vercel serverless)
- No new DB schema changes required — publishes directly into existing `submissions` table

---

## Out of Scope

- Multi-design extraction within a single page (one page = one submission)
- Background job queue (batch is small enough for synchronous processing)
- Separate admin role (reuses `is_moderator`)
- Leaderboard/award integration (published submissions are regular approved rows, already covered by existing queries)

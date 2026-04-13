# ARCHITECTURE.md — A Piece of Design

## 1. Project Summary

**A Piece of Design** is a community-driven web app where users submit photos of bad design, a multimodal AI instantly roasts each submission with a structured Design Roast Report, and the community votes to crown the worst designs in weekly/monthly leaderboards.

---

## 2. Tech Stack

| Layer | Choice | Justification |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript | Server Components reduce client JS; App Router collocates data fetching with UI; TypeScript catches schema drift early |
| **Styling** | Tailwind CSS | Rapid utility-first prototyping; no CSS file sprawl; trivially responsive |
| **Backend** | Next.js API Routes (Route Handlers) | Same repo as frontend; no separate server to deploy or maintain; serverless functions on Vercel scale to zero |
| **AI** | Groq API — `meta-llama/llama-4-scout-17b-16e-instruct` via OpenAI-compatible client (`openai` SDK, `baseURL` `https://api.groq.com/openai/v1`) | Fast vision inference; tool calling + JSON mode per Groq docs; image URL or base64; 128K context |
| **Database** | PostgreSQL via Supabase | Managed Postgres removes ops burden; built-in Row-Level Security enforces auth rules at DB layer; free tier fits project scale |
| **Auth** | Supabase Auth (Google + GitHub OAuth) | No password storage; OAuth tokens managed by Supabase; tight integration with RLS policies |
| **Image Storage** | Supabase Storage | Same project, same auth token; public CDN URLs usable directly in `<img>` tags and AI API calls |
| **Deployment** | Vercel | Zero-config Next.js deploys; preview URLs per PR; environment variables managed in dashboard |

**Why Groq:** The OpenAI-compatible `chat.completions` API supports vision and **forced function calling** for `submit_roast_report`, so roast fields are machine-readable without parsing free text. Latency is low on Groq’s inference stack; the Scout model is in preview — swap `GROQ_ROAST_MODEL` if Groq ships a newer vision default.

---

## 3. Data Model

### Entity-Relationship Overview

```
users ──< submissions ──< votes
                     ──< comments
                     ──< flags
                     ──< awards
```

---

### Table Definitions

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Mirrors `auth.users.id` from Supabase Auth |
| `username` | `text` UNIQUE | Display name |
| `avatar_url` | `text` | From OAuth provider |
| `created_at` | `timestamptz` | Default `now()` |

#### `submissions`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `users.id` | |
| `image_url` | `text` | Supabase Storage CDN URL |
| `title` | `text` | Short user-written title |
| `description` | `text` | User-written context |
| `category` | `text` | Enum: `ui_ux`, `physical_product`, `architecture`, `signage`, `packaging`, `other` |
| `status` | `text` | Enum: `pending`, `approved`, `rejected` — defaults to `pending` |
| `poop_score` | `int2` | 1–10, set by AI |
| `heuristics_violated` | `text[]` | Array of Nielsen heuristic names |
| `roast_text` | `text` | AI-generated witty roast |
| `fix_suggestion` | `text` | AI-generated constructive fix |
| `ai_confidence` | `float4` | 0–1; low values route to moderation queue |
| `vote_score` | `int4` | Denormalized sum of votes; updated by trigger |
| `created_at` | `timestamptz` | |

#### `votes`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `users.id` | |
| `submission_id` | `uuid` FK → `submissions.id` | |
| `value` | `int2` | `+1` or `-1` |
| `created_at` | `timestamptz` | |
| UNIQUE | `(user_id, submission_id)` | One vote per user per submission |

#### `comments`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `users.id` | |
| `submission_id` | `uuid` FK → `submissions.id` | |
| `body` | `text` | |
| `created_at` | `timestamptz` | |

#### `flags`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `users.id` | |
| `submission_id` | `uuid` FK → `submissions.id` | |
| `reason` | `text` | Free text |
| `created_at` | `timestamptz` | |
| UNIQUE | `(user_id, submission_id)` | One flag per user per submission |

#### `awards`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `submission_id` | `uuid` FK → `submissions.id` | |
| `trophy_type` | `text` | e.g. `golden_toilet_seat`, `silver_facepalm` |
| `period_type` | `text` | `weekly`, `monthly`, `alltime` |
| `period_label` | `text` | e.g. `2026-W14`, `2026-04` |
| `created_at` | `timestamptz` | |

---

### Key Database Mechanics

- **`vote_score` denormalization**: A PostgreSQL trigger on `votes` increments/decrements `submissions.vote_score` on insert/update/delete. This keeps the gallery sort query O(1) per row instead of requiring a JOIN + aggregate.
- **Row-Level Security**: Supabase RLS policies enforce that users can only mutate their own rows. Gallery reads are unrestricted for `status = 'approved'` rows. Moderation queue is readable only by a `moderator` role.
- **Leaderboard queries**: Computed on-the-fly with `WHERE created_at > [period_start] AND status = 'approved' ORDER BY vote_score DESC LIMIT 10`. No materialized view needed at this scale.

---

## 4. Application Architecture

### Directory Structure

```
/app
  /api
    /submissions/route.ts       ← POST: upload image, trigger AI roast
    /submissions/[id]/route.ts  ← GET: fetch one submission
    /votes/route.ts             ← POST/DELETE: cast or retract vote
    /moderation/route.ts        ← PATCH: approve/reject (moderator only)
  /(gallery)
    /page.tsx                   ← Public gallery with filters
    /[id]/page.tsx              ← Submission detail page
  /(leaderboard)
    /page.tsx                   ← Weekly/monthly leaderboard
  /hall-of-shame/page.tsx       ← All-time archive
  /submit/page.tsx              ← Submission form
  /profile/[username]/page.tsx  ← User profile
/lib
  /ai/roast.ts                  ← AI roast pipeline (see §5)
  /supabase/client.ts           ← Browser Supabase client
  /supabase/server.ts           ← Server Supabase client (cookies)
/components
  /SubmissionCard.tsx
  /RoastReport.tsx
  /VoteButtons.tsx
  /CategoryFilter.tsx
```

### Request Flow: Submission

```
Browser → POST /api/submissions
  1. Validate image (type, size ≤ 10MB)
  2. Upload image → Supabase Storage → get CDN URL
  3. Insert submission row (status: 'pending')
  4. Call AI roast pipeline (lib/ai/roast.ts)
  5. Update submission row with roast fields
     - If ai_confidence < 0.7 → status stays 'pending' (mod queue)
     - Else → status = 'approved'
  6. Return submission to client
Browser ← { submission with roast report }
```

---

## 5. Agentic Engineering Plan

The AI pipeline is the core of the product. It runs server-side in a Next.js Route Handler.

### 5.1 Tool-Use Schema

Rather than parsing prose, Groq is called with an OpenAI-style **function tool** and `tool_choice` forced to `submit_roast_report`:

```typescript
// lib/ai/roast.ts — OpenAI ChatCompletionTool shape

const ROAST_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_roast_report",
    description: "Submit a structured Design Roast Report for the uploaded image.",
    parameters: {
      type: "object",
      properties: {
        poop_score: { type: "integer", minimum: 1, maximum: 10, description: "…" },
        heuristics_violated: { type: "array", items: { type: "string" }, description: "…" },
        roast_text: { type: "string", description: "…" },
        fix_suggestion: { type: "string", description: "…" },
        confidence: { type: "number", minimum: 0, maximum: 1, description: "…" },
        should_moderate: { type: "boolean", description: "…" }
      },
      required: ["poop_score", "heuristics_violated", "roast_text", "fix_suggestion", "confidence", "should_moderate"]
    }
  }
};
```

### 5.2 System Prompt

```
You are the Chief Roast Officer at A Piece of Design, the internet's most prestigious bad design awards.
Your job is to analyze submitted images of bad design and produce a Design Roast Report.

Guidelines:
- Be specific: reference actual elements visible in the image.
- Be witty but not cruel: roast the design, not the person who made it.
- Apply Nielsen's 10 Usability Heuristics where applicable.
- If the image is not a design artifact (e.g., unrelated photo, nudity, violence), set confidence < 0.3 and should_moderate = true.
- The poop_score should reflect genuine usability failure, not just aesthetic preference.

Nielsen's 10 Heuristics (use these exact names in heuristics_violated):
1. Visibility of System Status
2. Match Between System and the Real World
3. User Control and Freedom
4. Consistency and Standards
5. Error Prevention
6. Recognition Rather Than Recall
7. Flexibility and Efficiency of Use
8. Aesthetic and Minimalist Design
9. Help Users Recognize, Diagnose, and Recover From Errors
10. Help and Documentation
```

### 5.3 Calling the API

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function generateRoastReport(imageUrl: string, userDescription: string) {
  const completion = await client.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    max_completion_tokens: 1024,
    tools: [ROAST_TOOL],
    tool_choice: { type: "function", function: { name: "submit_roast_report" } },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: `Category context from submitter: ${userDescription}` },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.function.name !== "submit_roast_report") throw new Error("No tool call");

  return JSON.parse(call.function.arguments) as RoastReport;
}
```

### 5.4 Routing Logic

After the AI responds:

```
ai_confidence < 0.4  →  status = 'rejected' (spam/NSFW, not shown at all)
ai_confidence 0.4–0.7  →  status = 'pending' (human moderation queue)
ai_confidence ≥ 0.7 AND should_moderate = false  →  status = 'approved' (live immediately)
should_moderate = true  →  status = 'pending' regardless of confidence
```

### 5.5 Leaderboard / Awards Cron (Stretch)

A Vercel Cron Job fires weekly and monthly:
1. Query top 3 submissions by `vote_score` in the period
2. Insert rows into `awards` with the appropriate `trophy_type` and `period_label`
3. These rows drive the trophy badge display on submission cards

---

## 6. Key Engineering Decisions & Trade-offs

| Decision | Alternative Considered | Reason for Choice |
|---|---|---|
| Groq + forced OpenAI-style `function` tool call | Prose + manual parse | Same structured-args pattern as OpenAI tool_calls; arguments JSON parsed once |
| Denormalized `vote_score` column | COUNT/SUM in query at read time | Gallery sort with pagination needs indexed integer; aggregate queries don't index well |
| Next.js Route Handlers (not FastAPI) | Separate FastAPI microservice | Fewer moving parts for a 4-week project; serverless on Vercel; no Docker/infra setup |
| `status` enum on submissions | Separate moderation table | Simpler queries; one row per submission; status transitions are linear |
| Supabase Storage for images | Cloudflare R2 | Same project auth context; CDN URLs work as-is; no extra credentials to manage |

---

## 7. Week-by-Week Build Plan

### Week 1 — Foundation
- [ ] Init Next.js 14 + TypeScript + Tailwind
- [ ] Create Supabase project, apply DB schema (migrations folder)
- [ ] Configure Supabase Auth (Google + GitHub OAuth)
- [ ] Set up Supabase Storage bucket with public read policy
- [ ] Wire up `lib/supabase/server.ts` and `lib/supabase/client.ts`
- [ ] Prototype `generateRoastReport()` in isolation; validate output on 5 test images
- [ ] Deploy skeleton to Vercel; confirm env vars work

**Check-in 1 deliverable:** Wireframes complete, Supabase initialized, AI prompt produces valid roast JSON on test images.

### Week 2 — Core Submission Flow
- [ ] Build `/submit` form with image upload + description + category
- [ ] Implement `POST /api/submissions`: validate → upload → AI roast → insert
- [ ] Build `RoastReport` display component
- [ ] Build submission confirmation/detail page
- [ ] Auth middleware: require login to submit

**Check-in 2 deliverable:** End-to-end flow — sign in, upload image, receive AI roast, data in DB.

### Week 3 — Social Layer
- [ ] Build paginated public gallery (`/`) with category/date/score filters
- [ ] Build `VoteButtons` component + `POST /api/votes` Route Handler
- [ ] Implement `vote_score` DB trigger
- [ ] Build leaderboard page with weekly/monthly toggle
- [ ] Build submission detail page with comments

**Check-in 3 deliverable:** Gallery browsable, voting functional, leaderboard renders.

### Week 4 — Moderation, Polish, Deploy
- [ ] Build moderation queue UI (moderator role only)
- [ ] Build Hall of Shame page (all-time top by vote_score)
- [ ] Community flagging (`POST /api/flags`)
- [ ] Responsive design pass (mobile breakpoints)
- [ ] Accessibility review (WCAG 2.1 AA for core flows)
- [ ] Final Vercel production deploy

---

## 8. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only, for admin ops
GROQ_API_KEY=                   # server-only, never exposed to client
GROQ_ROAST_MODEL=               # optional override (default: meta-llama/llama-4-scout-17b-16e-instruct)
```

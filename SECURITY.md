# Security Review

This document records the security review performed on **A Piece of Design** and
the controls that keep it safe.

## Secrets management

- **No secrets are committed.** The repository was scanned (working tree and full
  git history) for Groq keys (`gsk_…`), Supabase JWTs (`eyJ…`), and service-role
  keys. None are present.
- The only environment file in version control is [`.env.example`](./.env.example),
  which contains placeholders only.
- `.gitignore` ignores all real env files (`​.env`, `.env.*`) while keeping the
  `.env.example` template, so a real `.env.production` / `.env.local` can never be
  committed by accident.
- The Supabase **service-role key** (`SUPABASE_SERVICE_ROLE_KEY`) is read only in
  server-side code (`lib/supabase/admin.ts`, used from API routes that declare
  `runtime = "nodejs"`). It is never exposed to the client; only the
  `NEXT_PUBLIC_*` anon URL/key reach the browser.
- The Groq key (`GROQ_API_KEY`) is read only inside `lib/ai/roast.ts` on the
  server.

## Authentication & authorization

- All mutating API routes (`/api/submissions`, `/api/votes`, `/api/flags`,
  `/api/comments`, `/api/moderation`, `/api/submissions/[id]`) require an
  authenticated user via `supabase.auth.getUser()` and return `401` otherwise.
- Moderator-only actions check `users.is_moderator` server-side before acting.
- Deleting a submission is restricted to the owner or a moderator.
- **Row Level Security** is enabled on every table. Public reads are limited to
  `approved` submissions; owners and moderators can see their own / all rows.
- Users cannot vote on their own submissions — enforced both in the API route and
  by an RLS policy (`supabase/migrations/20260524000000_prevent_self_vote.sql`).

## Input validation & abuse prevention

- Image uploads are validated for MIME type (JPEG/PNG/WebP/GIF) and size (≤10 MB).
- Title (≤140 chars), description (≤2000 chars), and category (allow-list) are
  validated server-side.
- Vote values are constrained to `+1` / `-1` in the route and by a DB `check`.
- **Rate limiting:** a user may create at most **5 submissions per rolling 24h**,
  enforced in `/api/submissions` (returns `429` when exceeded).
- The AI roast pre-screens content: low-confidence or unsafe images are held in
  `pending`/`rejected` and never shown publicly until approved.

## Dependencies

- Run `npm audit` periodically. Production dependencies are limited to Next.js,
  React, the Supabase SDKs, and the OpenAI SDK (used against the Groq endpoint).

## Reporting

Found a vulnerability? Open a private security advisory on the GitHub repository
rather than a public issue.

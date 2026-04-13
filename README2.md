# A Piece of Design

> The internet's most entertaining (and educational) bad design awards — powered by AI.

Bad design is everywhere. Confusing parking meters. Hostile app interfaces. Absurd door handles. **A Piece of Design(APO)** is a community-driven web app where users submit real-world examples of terrible design, and a multimodal AI instantly analyzes each one — scoring it, roasting it, and explaining exactly *why* it's bad using established usability heuristics.

Think of it as the Golden Raspberry Awards, but for design.

## How It Works

1. **Submit** — Upload a photo of any bad design you encounter (app screenshot, product photo, street sign, anything) with a short description and category tag.
2. **AI Roast** — A multimodal AI generates a "Design Roast Report" featuring a 💩 Score (1–10), which of Nielsen's 10 Usability Heuristics it violates, a witty roast paragraph, and a constructive "How to Fix It" suggestion.
3. **Vote** — Browse the public gallery, upvote or downvote submissions, and discuss in the comments.
4. **Awards** — Weekly and monthly leaderboards crown the worst designs with tongue-in-cheek trophies like "The Golden Toilet Seat" and "The Silver Facepalm."

## Features

- AI-powered design analysis using multimodal vision models
- Community voting and discussion
- Filterable gallery by category (UI/UX, Physical Products, Architecture, Signage, Packaging, etc.)
- Weekly/monthly leaderboards with trophy badges
- Hall of Shame all-time archive
- Human moderation with community flagging
- OAuth authentication (Google/GitHub)
- Fully responsive (mobile + desktop)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React / Next.js + Tailwind CSS |
| Backend | Next.js API Routes or FastAPI |
| AI | Groq API (Llama 4 Scout vision) |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Storage | Supabase Storage / Cloudflare R2 |
| Deployment | Vercel |

## Timeline

| Week | Milestone | Check-in |
|------|-----------|----------|
| Week 1 | Wireframes, DB schema, AI prompt engineering, project setup | **Check-in 1:** Wireframes done, Supabase initialized, AI roast prompt validated on test images |
| Week 2 | Submission flow, AI report generation, authentication | **Check-in 2:** End-to-end flow working — user signs in, uploads image, receives AI roast report, data persists |
| Week 3 | Voting, gallery with filters, leaderboard | **Check-in 3:** Gallery browsable and filterable, voting functional, leaderboard displays correctly |
| Week 4 | Moderation, Hall of Shame, responsive polish, deploy | Final delivery on Vercel |

**Developer:** Rebecca Yang
**Agreed Fee:** 40 GIX Bucks
### Local setup (Week 1)

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill Supabase + `GROQ_API_KEY` when testing AI.
3. In [Supabase](https://supabase.com): new project → **SQL Editor** → run `supabase/migrations/20260413000000_initial_schema.sql`.
4. **Storage:** create a public bucket (e.g. `submissions`) for images; wire Week 2 upload API.
5. **Check-in 1 AI validation:** `GROQ_API_KEY=... npm run test:roast` (optional: `TEST_IMAGE_URL` for a bad-UI screenshot).
6. **Dev server:** `npm run dev`

Wireframes: `docs/wireframes.md` (or add a Figma link for your course).

## License

TODO

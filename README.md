# Visibility Evaluator

AI-scored visibility audits for indirect-channel (reseller) shops. Field reps
photograph a shop front from their phone or laptop, the photo is scored
automatically against the company's Visibility Matrix, and shops are ranked
by score — replacing the manual, subjective review process.

## The Visibility Matrix

Scoring is fixed by the business matrix (`src/lib/scoring.ts`), not by the
AI. The AI only counts what it sees in the photo; a deterministic function
turns those counts into points.

| Element | Points / unit | Max units counted | Capped max |
|---|---|---|---|
| Signage | 10 | 1 | 10 |
| Full stickers | 7 | 2 | 14 |
| Generic posters | 2.5 | 3 | 7.5 |
| Stripes | 1 | 3 | 3 |
| Approved reseller | 0.5 | 1 | 0.5 |
| Push/Pull | 0.25 | 1 | 0.25 |
| **Max achievable score** | | | **35.25** |

## How it works

1. **Submit** (`/submit`) — a rep uploads/takes a shop-front photo, tags the
   shop and captures GPS location from the browser.
2. **Score** (`POST /api/submissions`) — the photo is sent to a Claude
   vision call (`src/lib/ai-vision.ts`) that returns raw per-element counts
   plus a short reasoning note and confidence level. `src/lib/scoring.ts`
   applies the matrix's points-per-unit and caps to produce the score — the
   model never does the arithmetic itself.
3. **Rank** (`/`) — all submissions are listed ranked by score, with status
   (`PENDING` → `SCORED` → `REVIEWED`, or `FLAGGED` if AI scoring failed).
4. **Review** (`/submissions/[id]`) — a reviewer can see the AI's per-element
   counts and reasoning, and correct the counts if the AI missed or
   over-counted something. The AI's original output is kept as an audit
   trail (`aiElements`/`aiScore`); the correction becomes the `finalScore`
   used for ranking.

## Stack

- Next.js (App Router) + TypeScript + Tailwind — single deployable app,
  server-rendered pages, API routes for scoring/review.
- Prisma + SQLite for storage (swap `DATABASE_URL` to Postgres for
  production — the schema is provider-agnostic).
- Anthropic API (Claude, vision) for element detection.
- Photos are stored under `public/uploads` (swap for S3/blob storage before
  production — local disk doesn't survive serverless deploys).

## Running locally

```bash
npm install
cp .env.example .env   # add a real ANTHROPIC_API_KEY
npx prisma db push     # creates prisma/dev.db
npm run dev
```

Open http://localhost:3000/submit to create a submission, and
http://localhost:3000/ for the ranking.

## What's intentionally not built yet

- **Auth** — anyone with the URL can submit or review. Fine for an internal
  pilot; add real auth (e.g. SSO) before wider rollout.
- **Object storage** — photos live on local disk, which does not survive a
  serverless redeploy. Fine for a single always-on server; move to S3/Blob
  before deploying to Vercel or similar.
- **Shop/rep management UI** — shops and users are created implicitly from
  submission form input. A dedicated admin screen can come once the pilot
  validates the scoring flow.

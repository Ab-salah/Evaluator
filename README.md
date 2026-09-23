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
| Strips | 1 | 3 | 3 |
| Approved reseller | 0.5 | 1 | 0.5 |
| Push/Pull | 0.25 | 1 | 0.25 |
| **Max achievable score** | | | **35.25** |

Elements, labels, points-per-unit and caps are editable in-product at
`/admin/matrix` — not just in this table — so the Strategy & Data Analytics
team can tune the matrix without a code change.

## How it works

1. **Submit** (`/submit`) — a rep names the **brand being audited**,
   uploads/takes a shop-front photo, tags the shop and captures GPS
   location from the browser. Brand matters because a reseller shop usually
   carries several competing brands' branding in the same photo.
2. **Score** (`POST /api/submissions`) — the photo goes to a Claude vision
   call (`src/lib/ai-vision.ts`) that attributes each detected element to
   the brand that owns it, returning raw counts for the audited brand plus
   any competitor brands visible in frame. `src/lib/scoring.ts` applies the
   matrix's points-per-unit and caps to produce the score — the model never
   does the arithmetic itself — and computes **share of visibility**: the
   audited brand's score as a percentage of all branded visibility in the
   photo.
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
- Prisma + Postgres for storage.
- Vercel Blob for photo storage (serverless functions have no persistent
  filesystem, so photos can't live on local disk in production).
- Anthropic API (Claude, vision) for element detection.

## Deploying (Vercel, no local setup required)

1. On vercel.com, **Add New Project** → import this GitHub repo → pick the
   branch.
2. In the project's **Storage** tab, click **Create Database** → Postgres
   (Neon). This sets `DATABASE_URL` automatically.
3. Still in **Storage**, click **Create Database** → Blob. This sets
   `BLOB_READ_WRITE_TOKEN` automatically.
4. In **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` with a
   real key.
5. Deploy. Then open the project's **Storage → Postgres → Query** tab (or
   run `npx prisma db push` once from a machine with the `DATABASE_URL`) to
   create the tables — a fresh Postgres database has none yet.

Once deployed, redeploys are automatic on every push to the branch — no
local install, ever.

## Running locally

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, ANTHROPIC_API_KEY, BLOB_READ_WRITE_TOKEN
npx prisma db push
npm run dev
```

`DATABASE_URL` needs a real Postgres connection string (a free one from
[neon.tech](https://neon.tech) works, or pull the one from your deployed
Vercel project's Storage tab). `BLOB_READ_WRITE_TOKEN` likewise comes from
the Vercel project's Blob store settings.

Open http://localhost:3000/submit to create a submission, and
http://localhost:3000/ for the ranking.

## What's intentionally not built yet

- **Auth** — anyone with the URL can submit or review. Fine for an internal
  pilot; add real auth (e.g. SSO) before wider rollout.
- **Shop/rep management UI** — shops and users are created implicitly from
  submission form input. A dedicated admin screen can come once the pilot
  validates the scoring flow.

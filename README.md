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

1. **Submit** (`/submit`) — a rep takes/uploads a shop-front photo. It is
   downscaled in the browser, and the shop's name is read off its sign to
   prefill the form.
2. **Score** (`POST /api/submissions`) — a reseller shop carries several
   operators' branding at once, so a Claude vision call
   (`src/lib/ai-vision.ts`) finds **every operator** in the photo and counts
   each one's elements separately. `src/lib/scoring.ts` scores each operator
   out of the full matrix (e.g. stc 10, Zain 25, Batelco 30 — each / 35.25);
   the model never does the arithmetic itself.
3. **Dashboard** (`/`) — operator standings (each operator's average score
   per shop, counting shops without it as 0) and the top reseller shops,
   ranked by total branding or by any one operator. Based on each shop's
   latest audit.
4. **Review** (`/submissions/[id]`) — per-operator breakdowns, share of
   visibility, and the raw evaluation data. A reviewer can correct counts,
   add an operator the AI missed or remove one it got wrong; the AI's own
   counts are kept as an audit trail.

## Stack

- Next.js (App Router) + TypeScript + Tailwind — single deployable app,
  server-rendered pages, API routes for scoring/review.
- Prisma + Postgres for storage.
- Vercel Blob (private store) for photos, served through `/api/photos`.
- Anthropic API (Claude, vision) for element detection.

## Deploying (Vercel, no local setup required)

1. On vercel.com, **Add New Project** → import this GitHub repo → pick the
   branch.
2. In the project's **Storage** tab, click **Create Database** → Postgres
   (Neon). This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
3. Still in **Storage**, click **Create Database** → Blob (private). This
   sets `BLOB_READ_WRITE_TOKEN`.
4. In **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` with a
   real key from console.anthropic.com.
5. Deploy. The build runs `prisma migrate deploy`, which creates and updates
   the database tables itself.

Redeploys are automatic on every push to the branch.

## Running locally

```bash
npm install
cp .env.example .env   # fill in every value
npx prisma migrate deploy
npm run dev
```

`DATABASE_URL`/`DATABASE_URL_UNPOOLED` need a real Postgres (a free
[neon.tech](https://neon.tech) database works); `BLOB_READ_WRITE_TOKEN`
comes from the Vercel project's Blob store.

## What's intentionally not built yet

- **Auth** — anyone with the URL can submit or review. Fine for an internal
  pilot; add real auth (e.g. SSO) before wider rollout.
- **Shop/rep management UI** — shops and users are created implicitly from
  submission form input. A dedicated admin screen can come once the pilot
  validates the scoring flow.

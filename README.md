# Visibility Evaluator

Reseller-shop visibility audits, scored the same way every time. Field users
photograph a shop front from their phone or laptop; every operator's branding
in the photo is counted against the Visibility Matrix, scored, and ranked.
This replaces the old manual process: subjective scoring, manual effort and
inconsistent rankings.

- **Field users** sign in, take or upload a photo, and move on. Scoring runs
  in the background.
- **Admins** confirm or correct the AI's counts, score photos by hand when AI
  is off or fails, edit the matrix, and manage user accounts.
- Works on phones (bottom tab bar, camera-first flow) and on desktop
  (sidebar, side-by-side photo and scores).

## The Visibility Matrix

Scoring is fixed by the business matrix, not by the AI. The AI only counts
what it sees; a deterministic function (`src/lib/scoring.ts`) turns counts
into points.

| Element | Points / unit | Max units counted | Capped max |
|---|---|---|---|
| Signage | 10 | 1 | 10 |
| Full stickers | 7 | 2 | 14 |
| Generic posters | 2.5 | 3 | 7.5 |
| Strips | 1 | 3 | 3 |
| Approved reseller | 0.5 | 1 | 0.5 |
| Push/Pull | 0.25 | 1 | 0.25 |
| **Max per operator** | | | **35.25** |

Admins edit elements, points and caps in-app at **Visibility matrix**.

## How an audit flows

1. **New audit**: take or upload a photo, then crop or rotate it. The shop name
   is read off the sign automatically, and GPS is captured quietly.
2. **Scoring** runs in the background (`src/lib/scoring-job.ts`). Claude finds
   **every operator** in the photo (Zain, stc, Batelco…) and counts each
   one's elements separately. It also reads the shop name again as a safety
   net, so a shop is never left unnamed.
3. **Review queue** (admins) shows everything waiting on an admin:
   - *Needs check*: AI-scored and not yet confirmed, least-confident first.
     One tap confirms; the +/− steppers correct counts.
   - *Manual scoring*: AI failed or is switched off. Enter the counts by hand.
   - *Scoring now* and *Recently confirmed*.
4. **Dashboard**: operator standings, where an operator loses points, and the
   top shops, ranked by total or by any one operator, using each shop's
   latest audit.

## Hosting (self-hosted with Docker)

Everything runs from one `docker compose` file: the app, PostgreSQL, and a
volume for photos. It works on any Linux server, an Azure/AWS VM, or a laptop.

```bash
cp .env.example .env      # then edit: POSTGRES_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD, ANTHROPIC_API_KEY
docker compose up -d --build
```

Open `http://<server>:3000` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
The first admin is created automatically on that first sign-in. Change the
password under **Account**, then add people under **Users**.

- Database migrations run automatically every time the container starts.
- Photos are stored in the `uploads` volume, the database in `pgdata`.
  Back up both.
- Put it behind your usual HTTPS reverse proxy (nginx, IIS/ARR, Azure App
  Gateway…) and set `APP_URL=https://…` so sign-in cookies are marked Secure.
- Health check: `GET /api/health`.
- To use the official Zain logo in the header, add `public/logo.svg` (or
  `.png`) and rebuild.

### AI scoring

Set `ANTHROPIC_API_KEY` to turn on automatic scoring (model
`claude-opus-5-5`; override with `AI_MODEL`). Without a key the app still
works fully: every photo goes to *Manual scoring* in the review queue. The
server needs outbound HTTPS to `api.anthropic.com`. Behind a corporate proxy,
set `NODE_USE_ENV_PROXY=1` and `HTTPS_PROXY`.

## Running without Docker

Needs Node 20.9+ and PostgreSQL.

```bash
npm install
cp .env.example .env      # set DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:migrate
npm run dev               # or: npm run build && npm start
```

## Upgrading from the Vercel version

The migration `20261109120000_auth_and_self_hosting` adds accounts and
sessions. Accounts created implicitly by the old login-less version are kept,
so their audits stay linked. Old field reps and reviewers become field users,
and admins stay admins. None of them has a password yet; an admin sets one
under **Users**. Photos stored in Vercel Blob are not copied automatically:
download them and place them under `UPLOAD_DIR/submissions/` with the same
file names.

## Stack

Next.js 16 (App Router, standalone output) · TypeScript · Tailwind 4 · Prisma +
PostgreSQL · local-disk photo storage · Anthropic API (Claude vision) · Zain
brand font and palette.

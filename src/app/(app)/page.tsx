import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { getMatrixRules } from "@/lib/matrix";
import { maxScoreFor } from "@/lib/scoring";
import { brandColors, colorFor } from "@/lib/brand-colors";
import { getKnownBrands } from "@/lib/brands";
import { reviewQueueCount } from "@/lib/review";
import { AuditRow } from "@/components/AuditRow";
import { btn, Card, CardHeader, EmptyState, Icon, Photo, type IconName } from "@/components/ui";

export const dynamic = "force-dynamic";

function Kpi({ label, value, hint, icon, tint }: { label: string; value: React.ReactNode; hint?: string; icon: IconName; tint: string }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${tint}22`, color: tint }}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-bold text-neutral-500">{label}</div>
        <div className="truncate text-2xl font-extrabold tracking-tight text-brand-950">{value}</div>
        {hint && <div className="truncate text-[11px] text-neutral-400">{hint}</div>}
      </div>
    </Card>
  );
}

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: process.env.TZ || "Asia/Bahrain" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const MEDALS = ["#f6c343", "#b8c0cc", "#d08b4c"];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const [{ brand: filter }, data, rules, knownBrands, toReview, mine] = await Promise.all([
    searchParams,
    getDashboardData(),
    getMatrixRules(),
    getKnownBrands(),
    isAdmin ? reviewQueueCount() : Promise.resolve(0),
    prisma.submission.findMany({
      where: { submittedById: user.id },
      include: { shop: true, brandScores: { select: { brand: true, finalScore: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);
  const maxScore = maxScoreFor(rules);
  const colors = brandColors(knownBrands);
  const leader = data.operators[0];
  const selected = filter ? data.operators.find((o) => o.brand === filter) : undefined;
  const firstName = user.name.split(/\s+/)[0];

  const ranked = (
    filter
      ? data.shops
          .map((s) => ({ ...s, rankScore: s.brands.find((b) => b.brand === filter)?.score }))
          .filter((s): s is typeof s & { rankScore: number } => s.rankScore !== undefined)
          .sort((a, b) => b.rankScore - a.rankScore)
      : data.shops.map((s) => ({ ...s, rankScore: s.total })).sort((a, b) => b.total - a.total)
  ).slice(0, 15);

  // Where the selected operator loses points: average earned vs. cap per element, worst gap first.
  const gaps = selected
    ? rules
        .map((rule) => {
          const avgUnits = Math.min(selected.avgCounts[rule.key] ?? 0, rule.maxUnits);
          const avgPoints = Math.round(avgUnits * rule.pointsPerUnit * 100) / 100;
          const cappedMax = Math.round(rule.pointsPerUnit * rule.maxUnits * 100) / 100;
          return { label: rule.label, avgPoints, cappedMax, gap: cappedMax - avgPoints, pct: cappedMax > 0 ? (avgPoints / cappedMax) * 100 : 100 };
        })
        .sort((a, b) => b.gap - a.gap)
    : [];

  return (
    <div className="space-y-5">
      {/* Welcome band */}
      <section className="relative animate-rise overflow-hidden rounded-3xl bg-midnight px-5 py-6 text-white shadow-lg shadow-brand-900/20 sm:px-7 sm:py-7">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 bg-zain-pattern opacity-30 mix-blend-screen sm:h-96 sm:w-96" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-zain-sky">
              {greeting()}, {firstName}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {isAdmin && toReview > 0
                ? `${toReview} audit${toReview === 1 ? " needs" : "s need"} your review`
                : data.totalAudits === 0
                  ? "Let's audit the first shop"
                  : "Reseller visibility at a glance"}
            </h1>
            <p className="mt-1 max-w-lg text-sm text-white/70">
              Each operator is scored out of {maxScore} per shop on the current matrix, based on each shop&apos;s latest audit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && toReview > 0 && (
              <Link href="/review" className="inline-flex items-center gap-2 rounded-xl bg-zain-lime px-4 py-2.5 text-sm font-extrabold text-brand-950 transition hover:brightness-105 active:scale-[0.98]">
                <Icon name="inbox" className="h-4 w-4" /> Open review queue
              </Link>
            )}
            <Link href="/submit" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-brand-900 transition hover:bg-brand-50 active:scale-[0.98]">
              <Icon name="camera" className="h-4 w-4" /> New audit
            </Link>
          </div>
        </div>
      </section>

      {data.totalAudits === 0 ? (
        <Card>
          <EmptyState icon="store" title="No audits yet" action={<Link href="/submit" className={btn.primary}>Start the first audit</Link>}>
            Photograph a reseller shop front. Every operator&apos;s branding in the photo is scored against the Visibility Matrix
            and the shop is ranked automatically.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Shops audited" value={data.shops.length} icon="store" tint="#344c98" />
            <Kpi label="Total audits" value={data.totalAudits} icon="camera" tint="#23aeb7" />
            <Kpi label="Avg. per shop" value={data.avgScore} hint="all operators combined" icon="trophy" tint="#9b4291" />
            <Kpi
              label="Leading operator"
              value={leader?.brand ?? "—"}
              hint={leader ? `avg ${leader.avgScore} / ${maxScore}` : undefined}
              icon="sparkles"
              tint="#7f8f12"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="space-y-5">
              {data.operators.length > 0 && (
                <Card>
                  <CardHeader title="Operator standings" subtitle="Average per shop; shops without the operator count as 0. Tap one to rank shops by it." />
                  <ol className="space-y-1 p-2">
                    {data.operators.map((o, i) => {
                      const pct = maxScore > 0 ? Math.min(100, (o.avgScore / maxScore) * 100) : 0;
                      const active = filter === o.brand;
                      return (
                        <li key={o.brand}>
                          <Link
                            href={active ? "/" : `/?brand=${encodeURIComponent(o.brand)}`}
                            scroll={false}
                            className={`block rounded-xl px-3 py-2.5 transition ${active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-canvas"}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 text-center text-sm font-extrabold text-neutral-400">{i + 1}</span>
                              <span className="h-3 w-3 rounded-full" style={{ background: colorFor(colors, o.brand) }} />
                              <span className="flex-1 font-extrabold text-brand-950">{o.brand}</span>
                              <span className="text-lg font-extrabold tabular-nums text-brand-950">{o.avgScore}</span>
                            </div>
                            <div className="ml-8 mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100">
                              <div className="h-full animate-grow rounded-full" style={{ width: `${pct}%`, background: colorFor(colors, o.brand) }} />
                            </div>
                            <div className="ml-8 mt-1 text-[11px] text-neutral-500">
                              In {o.presentIn} of {data.shops.length} shops · best: {o.bestShop.name} ({o.bestShop.score})
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </Card>
              )}

              {selected && (
                <Card className="animate-rise">
                  <CardHeader
                    title={`Where ${selected.brand} loses points`}
                    subtitle={`Average earned vs. the cap, over the ${selected.presentIn} shop${selected.presentIn === 1 ? "" : "s"} carrying it. Biggest gap first.`}
                    action={<Link href="/" scroll={false} className={btn.ghost}>Clear</Link>}
                  />
                  <ul className="space-y-3 p-4 sm:p-5">
                    {gaps.map((g) => (
                      <li key={g.label}>
                        <div className="flex justify-between text-sm">
                          <span className={g.gap > 0 ? "font-bold text-brand-950" : "text-neutral-400"}>{g.label}</span>
                          <span className="tabular-nums text-neutral-600">
                            <b>{g.avgPoints}</b> / {g.cappedMax}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full animate-grow rounded-full" style={{ width: `${g.pct}%`, background: g.pct < 40 ? "#ab1368" : colorFor(colors, selected.brand) }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {mine.length > 0 && (
                <Card>
                  <CardHeader title="Your latest audits" action={<Link href="/audits" className={btn.ghost}>See all</Link>} />
                  <ul className="divide-y divide-neutral-100">
                    {mine.map((a) => (
                      <AuditRow key={a.id} a={a} colors={colors} audience={isAdmin ? "admin" : "user"} showSubmitter={false} />
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader
                title={filter ? `Top shops for ${filter}` : "Top reseller shops"}
                subtitle={filter ? `Ranked by ${filter}'s score, out of ${maxScore}` : "Ranked by total branded visibility across all operators"}
              />
              <div className="-mb-1 flex gap-1.5 overflow-x-auto px-4 pt-3 sm:px-5">
                <Link
                  href="/"
                  scroll={false}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${!filter ? "bg-brand-700 text-white" : "bg-canvas text-brand-900 hover:bg-brand-100"}`}
                >
                  All operators
                </Link>
                {data.operators.map((o) => (
                  <Link
                    key={o.brand}
                    href={`/?brand=${encodeURIComponent(o.brand)}`}
                    scroll={false}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${filter === o.brand ? "text-white" : "bg-canvas text-brand-900 hover:bg-brand-100"}`}
                    style={filter === o.brand ? { background: colorFor(colors, o.brand) } : undefined}
                  >
                    {o.brand}
                  </Link>
                ))}
              </div>
              {ranked.length === 0 ? (
                <EmptyState icon="search" title={filter ? `No shop carries ${filter} yet` : "No scored shops yet"}>
                  Shops appear here once their audit has been scored.
                </EmptyState>
              ) : (
                <ol className="divide-y divide-neutral-100 pt-2">
                  {ranked.map((s, i) => (
                    <li key={s.shopId}>
                      <Link href={`/submissions/${s.submissionId}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/60 sm:px-5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold"
                          style={i < 3 ? { background: MEDALS[i], color: "#281f51" } : { background: "#f5f6fa", color: "#8a93b3" }}
                        >
                          {i + 1}
                        </span>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                          <Photo src={s.imagePath} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-extrabold text-brand-950">{s.shopName}</div>
                          <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-neutral-100">
                            {s.brands.map((b) => (
                              <span
                                key={b.brand}
                                title={`${b.brand} ${b.score}`}
                                style={{
                                  width: `${(b.score / (filter ? maxScore : Math.max(1, ranked[0].rankScore))) * 100}%`,
                                  background: colorFor(colors, b.brand),
                                  opacity: filter && b.brand !== filter ? 0.15 : 1,
                                }}
                              />
                            ))}
                          </div>
                          <div className="mt-1 truncate text-[11px] text-neutral-500">
                            {s.brands.map((b) => `${b.brand} ${b.score}`).join(" · ") || s.location || "—"}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xl font-extrabold tabular-nums text-brand-700">{s.rankScore}</div>
                          <div className="text-[10px] text-neutral-400">{filter ? `/ ${maxScore}` : "pts"}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

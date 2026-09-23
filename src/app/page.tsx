import Link from "next/link";
import Image from "next/image";
import { getDashboardData } from "@/lib/dashboard";
import { getMatrixRules } from "@/lib/matrix";
import { maxScoreFor } from "@/lib/scoring";
import { brandColors } from "@/lib/brand-colors";
import { getKnownBrands } from "@/lib/brands";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-neutral-400">{hint}</div>}
    </div>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const { brand: filter } = await searchParams;
  const [data, rules, knownBrands] = await Promise.all([
    getDashboardData(),
    getMatrixRules(),
    getKnownBrands(),
  ]);
  const maxScore = maxScoreFor(rules);
  const colors = brandColors(knownBrands);
  const leader = data.operators[0];

  const ranked = filter
    ? data.shops
        .map((s) => ({ ...s, rankScore: s.brands.find((b) => b.brand === filter)?.score }))
        .filter((s): s is typeof s & { rankScore: number } => s.rankScore !== undefined)
        .sort((a, b) => b.rankScore - a.rankScore)
    : data.shops.map((s) => ({ ...s, rankScore: s.total })).sort((a, b) => b.total - a.total);

  if (data.totalAudits === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
        <h1 className="text-lg font-semibold">No audits yet</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
          Photograph a reseller shop front. Every operator&apos;s branding in the photo is
          scored against the visibility matrix.
        </p>
        <Link
          href="/submit"
          className="mt-5 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Start the first audit
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-neutral-500">
            Each operator is scored out of {maxScore} per shop, on the current matrix.
          </p>
        </div>
        <Link
          href="/submit"
          className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New audit
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Shops audited" value={data.shops.length} />
        <Kpi label="Total audits" value={data.totalAudits} />
        <Kpi
          label="Leading operator"
          value={leader?.brand ?? "—"}
          hint={leader ? `avg ${leader.avgScore} / ${maxScore}` : undefined}
        />
        <Kpi
          label="Top shop"
          value={data.shops.length ? [...data.shops].sort((a, b) => b.total - a.total)[0].shopName : "—"}
          hint="most total branding"
        />
      </div>

      {data.awaitingReview.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-medium text-amber-900">
            {data.awaitingReview.length} audit{data.awaitingReview.length === 1 ? "" : "s"} could
            not be scored automatically and need a reviewer
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.awaitingReview.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/submissions/${s.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                >
                  {s.shopName}
                  <StatusBadge status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.operators.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h2 className="font-semibold">Operator standings</h2>
            <p className="text-xs text-neutral-500">
              Average score per shop across all {data.shops.length} audited shops (a shop without
              the operator counts as 0). Click an operator to rank shops by it.
            </p>
          </div>
          <ol className="divide-y divide-neutral-100">
            {data.operators.map((o, i) => {
              const pct = maxScore > 0 ? Math.min(100, (o.avgScore / maxScore) * 100) : 0;
              return (
                <li key={o.brand}>
                  <Link
                    href={filter === o.brand ? "/" : `/?brand=${encodeURIComponent(o.brand)}`}
                    className={`block px-4 py-3 transition-colors hover:bg-neutral-50 ${
                      filter === o.brand ? "bg-neutral-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-sm font-semibold text-neutral-400">{i + 1}</span>
                      <span className="flex-1 font-medium">{o.brand}</span>
                      <span className="font-mono text-lg font-semibold">{o.avgScore}</span>
                      <span className="text-xs text-neutral-400">/ {maxScore}</span>
                    </div>
                    <div className="ml-8 mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div className={`h-full rounded-full ${colors[o.brand].bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="ml-8 mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-neutral-500">
                      <span>
                        In {o.presentIn} of {data.shops.length} shops
                      </span>
                      <span className="truncate">
                        Best: {o.bestShop.name} ({o.bestShop.score})
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="font-semibold">Top reseller shops</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link
              href="/"
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                !filter ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All operators (total)
            </Link>
            {data.operators.map((o) => (
              <Link
                key={o.brand}
                href={`/?brand=${encodeURIComponent(o.brand)}`}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filter === o.brand
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {o.brand}
              </Link>
            ))}
          </div>
        </div>

        {ranked.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            {filter ? `No audited shop carries ${filter} branding yet.` : "No scored shops yet."}
          </p>
        ) : (
          <ol className="divide-y divide-neutral-100">
            {ranked.map((s, i) => (
              <li key={s.shopId}>
                <Link
                  href={`/submissions/${s.submissionId}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50"
                >
                  <span className="w-5 text-sm font-semibold text-neutral-400">{i + 1}</span>
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <Image src={s.imagePath} alt={s.shopName} fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.shopName}</div>
                    <div className="truncate text-xs text-neutral-500">
                      {s.location || "No location on file"}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.brands.map((b) => (
                        <span
                          key={b.brand}
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${colors[b.brand].chip}`}
                        >
                          {b.brand} {b.score}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-xl font-semibold">{s.rankScore}</div>
                    <div className="text-[11px] text-neutral-400">
                      {filter ? `${filter} / ${maxScore}` : "total"}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

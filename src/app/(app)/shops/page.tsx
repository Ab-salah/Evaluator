import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMatrixRules } from "@/lib/matrix";
import { getShopSummaries, type ShopSummary } from "@/lib/shops";
import { HOME_BRAND } from "@/lib/action-plan";
import { timeAgo } from "@/components/AuditRow";
import { btn, Card, EmptyState, Icon, input, PageHeader, Photo } from "@/components/ui";

export const metadata: Metadata = { title: "Shops" };
export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "", label: "All shops" },
  { key: "leads", label: `${HOME_BRAND} leads` },
  { key: "behind", label: `${HOME_BRAND} behind` },
  { key: "absent", label: `No ${HOME_BRAND}` },
  { key: "unscored", label: "Not scored yet" },
] as const;

function inView(s: ShopSummary, view: string) {
  switch (view) {
    case "leads":
      return !!s.plan?.present && s.plan.leading;
    case "behind":
      return !!s.plan && !s.plan.leading;
    case "absent":
      return !!s.plan && !s.plan.present;
    case "unscored":
      return !s.plan;
    default:
      return true;
  }
}

function Standing({ s }: { s: ShopSummary }) {
  const pill = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset";
  if (!s.plan) {
    const label = s.lastStatus === "PENDING" ? "Scoring…" : s.lastStatus === "FLAGGED" ? "Waiting for a manual score" : "Not scored yet";
    return <span className={`${pill} bg-neutral-100 text-neutral-600 ring-neutral-200`}>{label}</span>;
  }
  const p = s.plan;
  if (p.leading && p.present) {
    return (
      <span className={`${pill} bg-emerald-50 text-emerald-800 ring-emerald-200`}>
        {p.rival ? `${p.brand} leads by ${Math.round((p.score - p.rival.score) * 100) / 100}` : `Only ${p.brand}`}
      </span>
    );
  }
  if (!p.leading) {
    return (
      <span className={`${pill} bg-red-50 text-red-800 ring-red-200`}>
        {p.rival!.brand} ahead by {p.gapToLead}
      </span>
    );
  }
  return <span className={`${pill} bg-amber-50 text-amber-800 ring-amber-200`}>No branding found</span>;
}

export default async function ShopsPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  await requireUser();
  const [sp, rules] = await Promise.all([searchParams, getMatrixRules()]);
  const all = await getShopSummaries(rules);
  const q = sp.q?.trim() ?? "";
  const view = VIEWS.some((v) => v.key === sp.view) ? sp.view! : "";
  const needle = q.toLowerCase();
  const matches = (s: ShopSummary) =>
    !needle || [s.name, s.code, s.city, s.region].some((v) => v?.toLowerCase().includes(needle));
  const searched = all.filter(matches);
  const shops = searched.filter((s) => inView(s, view));

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: q || undefined, view: view || undefined, ...patch })) if (v) p.set(k, v);
    const str = p.toString();
    return `/shops${str ? `?${str}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Shops"
        subtitle={`${all.length} reseller shop${all.length === 1 ? "" : "s"} audited. Each shop's standing comes from its latest scored audit.`}
        action={
          <Link href="/submit" className={btn.primary}>
            <Icon name="camera" className="h-4 w-4" /> New audit
          </Link>
        }
      />

      <div className="mb-4 space-y-3">
        <form action="/shops" className="relative">
          {view && <input type="hidden" name="view" value={view} />}
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-neutral-400" />
          <input name="q" defaultValue={q} placeholder="Search shop, code, city or region" className={`${input} pl-11`} />
        </form>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {VIEWS.map((v) => {
            const n = searched.filter((s) => inView(s, v.key)).length;
            if (v.key === "unscored" && n === 0) return null;
            return (
              <Link
                key={v.key}
                href={href({ view: v.key || undefined })}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                  view === v.key ? "bg-brand-700 text-white" : "bg-white text-brand-900 ring-1 ring-neutral-200 hover:bg-brand-50"
                }`}
              >
                {v.label}
                <span className={`rounded-full px-1.5 text-[11px] ${view === v.key ? "bg-white/20" : "bg-brand-50 text-brand-700"}`}>{n}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <Card>
        {shops.length === 0 ? (
          <EmptyState
            icon="store"
            title={all.length === 0 ? "No shops yet" : "No shops match"}
            action={
              all.length === 0 ? (
                <Link href="/submit" className={btn.primary}>
                  Audit the first shop
                </Link>
              ) : (
                <Link href="/shops" className={btn.secondary}>
                  Clear filters
                </Link>
              )
            }
          >
            {all.length === 0 ? "Shops appear here after their first audit." : "Try a different search or filter."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {shops.map((s) => (
              <li key={s.id}>
                <Link href={`/shops/${s.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/60 sm:px-5">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    {s.latest && <Photo src={s.latest.imagePath} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate font-extrabold text-brand-950">{s.name}</span>
                      {s.code && <span className="text-[11px] font-bold text-neutral-400">{s.code}</span>}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-neutral-500">
                      {[...new Set([s.city, s.region].filter(Boolean))].join(" · ") || "No area"} · audited {timeAgo(s.lastAuditAt)}
                      {s.audits > 1 ? ` · ${s.audits} audits` : ""}
                    </div>
                    <div className="mt-1.5">
                      <Standing s={s} />
                    </div>
                  </div>
                  {s.home && (
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] font-bold text-neutral-400">{HOME_BRAND}</div>
                      <div className="text-xl font-extrabold tabular-nums text-brand-700">{s.home.score}</div>
                      {s.home.change !== null && (
                        <div
                          className={`text-[11px] font-bold tabular-nums ${
                            s.home.change > 0 ? "text-emerald-700" : s.home.change < 0 ? "text-red-700" : "text-neutral-400"
                          }`}
                          title="Change since the previous audit"
                        >
                          {s.home.change > 0 ? `▲ ${s.home.change}` : s.home.change < 0 ? `▼ ${Math.abs(s.home.change)}` : "no change"}
                        </div>
                      )}
                    </div>
                  )}
                  <Icon name="chevron-right" className="h-5 w-5 shrink-0 text-neutral-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

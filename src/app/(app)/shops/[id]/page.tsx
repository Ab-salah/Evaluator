import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMatrixRules } from "@/lib/matrix";
import { getKnownBrands } from "@/lib/brands";
import { brandColors, colorFor } from "@/lib/brand-colors";
import { maxScoreFor, shareOfVisibility } from "@/lib/scoring";
import { actionPlan } from "@/lib/action-plan";
import { brandsOf, getShopDetail, SCORED_STATUSES } from "@/lib/shops";
import { ActionPlanCard } from "@/components/ActionPlanCard";
import { AuditRow } from "@/components/AuditRow";
import { TrendChart } from "@/components/TrendChart";
import { btn, Card, CardHeader, EmptyState, Icon, Notice, PageHeader, Photo } from "@/components/ui";

export const metadata: Metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: process.env.TZ || "Asia/Bahrain" });

export default async function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const isAdmin = user.role === "ADMIN";
  const shop = await getShopDetail(id);
  if (!shop || shop.submissions.length === 0) notFound();

  const [rules, knownBrands] = await Promise.all([getMatrixRules(), getKnownBrands()]);
  const colors = brandColors(knownBrands);
  const maxScore = maxScoreFor(rules);

  const scored = shop.submissions.filter((s) => SCORED_STATUSES.has(s.status));
  const latest = scored[0] ?? null;
  const latestBrands = latest ? brandsOf(latest.brandScores) : [];
  const share = shareOfVisibility(latestBrands);
  const plan = latest ? actionPlan(latestBrands, rules) : null;
  const located = shop.submissions.find((s) => s.latitude != null && s.longitude != null);
  const mapUrl = located ? `https://www.google.com/maps?q=${located.latitude},${located.longitude}` : null;

  // Score per scored audit, oldest first; an operator missing from an audit scored 0 there.
  const history = [...scored].reverse();
  const operators = [...new Set(history.flatMap((s) => s.brandScores.map((b) => b.brand)))];
  const series = operators
    .map((brand) => ({
      name: brand,
      color: colorFor(colors, brand),
      values: history.map((s) => s.brandScores.find((b) => b.brand === brand)?.finalScore ?? 0),
    }))
    .sort((a, b) => b.values[b.values.length - 1] - a.values[a.values.length - 1]);

  return (
    <div>
      <PageHeader
        back={{ href: "/shops", label: "Shops" }}
        title={shop.name}
        subtitle={[...new Set([shop.code, shop.address, shop.city, shop.region].filter(Boolean))].join(" · ") || undefined}
        action={
          <div className="flex gap-2">
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noreferrer" className={btn.secondary}>
                <Icon name="map-pin" className="h-4 w-4" /> Map
              </a>
            )}
            <Link href={`/submit?shop=${shop.id}`} className={btn.primary}>
              <Icon name="camera" className="h-4 w-4" /> Audit again
            </Link>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          {latest ? (
            <a href={latest.imagePath} target="_blank" rel="noreferrer" title="Open full-size photo" className="block overflow-hidden rounded-2xl bg-brand-950">
              <Photo src={latest.imagePath} alt={shop.name} className="max-h-[45vh] w-full object-contain lg:max-h-[60vh]" />
            </a>
          ) : (
            <a href={shop.submissions[0].imagePath} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-brand-950">
              <Photo src={shop.submissions[0].imagePath} alt={shop.name} className="max-h-[45vh] w-full object-contain" />
            </a>
          )}
          <Card className="grid grid-cols-3 divide-x divide-neutral-100 text-center">
            <div className="px-2 py-3">
              <div className="text-xl font-extrabold text-brand-950">{shop.submissions.length}</div>
              <div className="text-[11px] font-bold text-neutral-500">audit{shop.submissions.length === 1 ? "" : "s"}</div>
            </div>
            <div className="px-2 py-3">
              <div className="text-sm font-extrabold text-brand-950">{day(shop.submissions[shop.submissions.length - 1].createdAt)}</div>
              <div className="text-[11px] font-bold text-neutral-500">first audit</div>
            </div>
            <div className="px-2 py-3">
              <div className="text-sm font-extrabold text-brand-950">{day(shop.submissions[0].createdAt)}</div>
              <div className="text-[11px] font-bold text-neutral-500">latest audit</div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {!latest && (
            <Notice tone="info" title="Not scored yet">
              This shop&apos;s audit is still being scored or is waiting for an admin. Its standing appears here once it has a score.
            </Notice>
          )}

          {latest && (
            <Card>
              <CardHeader
                title="Current standing"
                subtitle={`From the audit on ${day(latest.createdAt)}. Each operator is scored out of ${maxScore}.`}
                action={
                  isAdmin || latest.submittedById === user.id ? (
                    <Link href={`/submissions/${latest.id}`} className={btn.ghost}>
                      Open audit
                    </Link>
                  ) : undefined
                }
              />
              <div className="p-4 sm:p-5">
                {share.length > 0 ? (
                  <>
                    <div className="flex h-4 gap-0.5 overflow-hidden rounded-full bg-neutral-100">
                      {share.map((line) => (
                        <div
                          key={line.brand}
                          className="h-full animate-grow first:rounded-l-full last:rounded-r-full"
                          style={{ width: `${line.sharePercent}%`, background: colorFor(colors, line.brand) }}
                          title={`${line.brand} ${line.sharePercent}%`}
                        />
                      ))}
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {share.map((line, i) => (
                        <li key={line.brand} className="flex items-center gap-2">
                          <span className="w-4 text-center text-xs font-extrabold text-neutral-400">{i + 1}</span>
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(colors, line.brand) }} />
                          <b className="flex-1 text-brand-950">{line.brand}</b>
                          <span className="tabular-nums text-neutral-500">
                            {line.score} pts · {line.sharePercent}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-neutral-500">No operator branding was found in the latest audit.</p>
                )}
              </div>
            </Card>
          )}

          {plan && <ActionPlanCard plan={plan} color={colorFor(colors, plan.brand)} />}

          <Card>
            <CardHeader title="Score history" subtitle="Each operator's score at every scored audit of this shop." />
            <div className="p-4 sm:p-5">
              {history.length >= 2 ? (
                <TrendChart
                  labels={history.map((s) => day(s.createdAt))}
                  series={series}
                  caption={`Score history for ${shop.name}: ${series.map((s) => `${s.name} ${s.values[s.values.length - 1]}`).join(", ")} at the latest audit.`}
                />
              ) : (
                <p className="text-sm text-neutral-500">The trend appears after this shop&apos;s second scored audit.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="All audits" subtitle={isAdmin ? undefined : "You can open the audits you submitted."} />
            {shop.submissions.length === 0 ? (
              <EmptyState title="No audits" />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {shop.submissions.map((a) => (
                  <AuditRow
                    key={a.id}
                    a={{ ...a, shop: { name: shop.name, city: shop.city } }}
                    colors={colors}
                    audience={isAdmin ? "admin" : "user"}
                    linkable={isAdmin || a.submittedById === user.id}
                  />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

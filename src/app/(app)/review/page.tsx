import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getReviewQueue } from "@/lib/review";
import { getKnownBrands } from "@/lib/brands";
import { brandColors } from "@/lib/brand-colors";
import { aiEnabled, AI_MODEL } from "@/lib/ai-vision";
import { AuditRow } from "@/components/AuditRow";
import { Card, CardHeader, EmptyState, Icon, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Review queue" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "check", label: "Needs check", icon: "search" },
  { key: "failed", label: "Manual scoring", icon: "alert" },
  { key: "progress", label: "Scoring now", icon: "clock" },
  { key: "done", label: "Recently confirmed", icon: "check-circle" },
] as const;

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const [{ tab: tabParam }, queue, knownBrands] = await Promise.all([searchParams, getReviewQueue(), getKnownBrands()]);
  const colors = brandColors(knownBrands);
  const lists = { check: queue.toCheck, failed: queue.failed, progress: queue.inProgress, done: queue.recent };
  // Open on the most urgent non-empty tab.
  const tab =
    (TABS.find((t) => t.key === tabParam)?.key as keyof typeof lists | undefined) ??
    (queue.failed.length ? "failed" : queue.toCheck.length ? "check" : queue.inProgress.length ? "progress" : "done");
  const items = lists[tab];
  const aiOn = aiEnabled();

  return (
    <div>
      <PageHeader
        title="Review queue"
        subtitle="Everything waiting on an admin, most urgent first. Confirming an audit locks its scores into the rankings."
      />

      <div className="mb-4">
        {aiOn ? (
          <Notice tone="info" title={`AI scoring is on (${AI_MODEL})`}>
            New photos are scored automatically. Check its counts against the photo and confirm or correct them.
          </Notice>
        ) : (
          <Notice tone="warn" title="AI scoring is off">
            No ANTHROPIC_API_KEY is set on the server, so every photo lands in Manual scoring. Add a key to the server&apos;s
            environment to switch automatic scoring on.
          </Notice>
        )}
      </div>

      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-neutral-200">
          {TABS.map((t) => {
            const n = lists[t.key].length;
            const active = t.key === tab;
            return (
              <Link
                key={t.key}
                href={`/review?tab=${t.key}`}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                  active ? "bg-brand-700 text-white" : "text-brand-900 hover:bg-brand-50"
                }`}
              >
                <Icon name={t.icon} className="h-4 w-4" />
                {t.label}
                {t.key !== "done" && n > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-extrabold ${
                      active ? "bg-white/20" : t.key === "failed" ? "bg-red-100 text-red-700" : "bg-brand-100 text-brand-800"
                    }`}
                  >
                    {n}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader
          title={TABS.find((t) => t.key === tab)!.label}
          subtitle={
            {
              check: "Scored by AI, not yet checked. Least confident first.",
              failed: "AI couldn't score these (or it's switched off). Open one and enter the counts.",
              progress: "Being scored right now — nothing to do yet.",
              done: "The last 20 audits an admin confirmed.",
            }[tab]
          }
        />
        {items.length === 0 ? (
          <EmptyState icon="check-circle" title="All clear">
            {tab === "done" ? "Nothing has been confirmed yet." : "Nothing is waiting here."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {items.map((a) => (
              <AuditRow key={a.id} a={a} colors={colors} note={tab === "failed" ? a.aiSummary ?? "Scoring did not finish." : undefined} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

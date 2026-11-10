import type { ActionPlan } from "@/lib/action-plan";
import { Card, CardHeader, Icon } from "./ui";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""));

/** What the home brand should add at this shop, and how to take the lead. */
export function ActionPlanCard({ plan, color }: { plan: ActionPlan; color: string }) {
  const pct = plan.maxScore > 0 ? Math.min(100, (plan.score / plan.maxScore) * 100) : 0;
  const afterPct = plan.maxScore > 0 ? Math.min(100, ((plan.score + plan.potential) / plan.maxScore) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon name="trophy" className="h-4 w-4 text-zain-teal" /> {plan.brand} action plan
          </span>
        }
        subtitle="What to add at this shop, worth the most points first. Based on the current Visibility Matrix."
      />

      <div className="space-y-4 p-4 sm:p-5">
        {/* Headline */}
        {!plan.present ? (
          <div className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
            <b>No {plan.brand} branding was found here.</b>{" "}
            {plan.rival ? `${plan.rival.brand} scores ${fmt(plan.rival.score)} points at this shop.` : ""} A full set is
            worth up to {fmt(plan.maxScore)} points.
          </div>
        ) : plan.leading ? (
          <div className="rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">
            <b>{plan.brand} leads at this shop</b>
            {plan.rival ? ` by ${fmt(Math.max(0, plan.score - plan.rival.score))} points over ${plan.rival.brand}.` : ", with no rival branding visible."}
            {plan.potential > 0 ? ` There are still ${fmt(plan.potential)} points available.` : " Every element is at its cap."}
          </div>
        ) : (
          <div className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-900">
            <b>
              {plan.rival!.brand} leads by {fmt(plan.gapToLead)} points.
            </b>{" "}
            {plan.toLead
              ? `To move ahead: ${plan.toLead.map((t) => `${t.add} × ${t.label} (+${fmt(t.gain)})`).join(", ")}.`
              : `Even a full set of ${plan.brand} branding would not overtake ${plan.rival!.brand} here.`}
          </div>
        )}

        {/* Now vs. potential */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs font-bold text-neutral-500">
            <span>
              Now <span className="text-sm text-brand-950">{fmt(plan.score)}</span>
            </span>
            <span>
              Possible <span className="text-sm text-brand-950">{fmt(round2(plan.score + plan.potential))}</span> / {fmt(plan.maxScore)}
            </span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-neutral-100">
            <div className="absolute inset-y-0 left-0 rounded-full opacity-25" style={{ width: `${afterPct}%`, background: color }} />
            <div className="absolute inset-y-0 left-0 animate-grow rounded-full" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>

        {/* Checklist */}
        {plan.steps.length > 0 ? (
          <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
            {plan.steps.map((s) => (
              <li key={s.key} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-extrabold text-brand-700">
                  +{s.add}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-brand-950">{s.label}</span>
                  <span className="block text-xs text-neutral-500">
                    {fmt(s.pointsPerUnit)} {s.pointsPerUnit === 1 ? "pt" : "pts"} each{s.add > 1 ? `, up to ${s.add} more` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-extrabold tabular-nums text-emerald-700">+{fmt(s.gain)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <Icon name="check-circle" className="h-4 w-4" /> Nothing left to add: every element is at its cap.
          </p>
        )}
      </div>
    </Card>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

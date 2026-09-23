type Rating = { score: number; reasoning: string };

function RatingCard({
  label,
  hint,
  score,
  max,
  reasoning,
  accent,
}: {
  label: string;
  hint: string;
  score: number;
  max: number;
  reasoning?: string;
  accent: string;
}) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className="mt-0.5 font-mono text-xl font-semibold">
        {score}
        <span className="text-sm font-normal text-neutral-400"> / {max}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${accent}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">{hint}</p>
      {reasoning && <p className="mt-1.5 text-xs text-neutral-600">{reasoning}</p>}
    </div>
  );
}

/**
 * Three views of the same photo side by side: the mechanical matrix score
 * (rule-based, what the rest of the app ranks on) next to two AI judgement
 * calls — customer appeal and industry-standard comparison. The latter two
 * are a second opinion to read alongside the matrix, not part of any score
 * or ranking.
 */
export function RatingsSummary({
  matrixTotal,
  matrixMax,
  ratings,
}: {
  matrixTotal: number;
  matrixMax: number;
  ratings: { customerAppeal: Rating; industryStandard: Rating } | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <RatingCard
        label="Matrix score"
        hint="Rule-based — points per element, capped"
        score={matrixTotal}
        max={matrixMax}
        accent="bg-brand-700"
      />
      {ratings ? (
        <>
          <RatingCard
            label="Customer appeal"
            hint="Would a walk-by customer find this inviting?"
            score={ratings.customerAppeal.score}
            max={10}
            reasoning={ratings.customerAppeal.reasoning}
            accent="bg-gold-500"
          />
          <RatingCard
            label="Industry standard"
            hint="Vs. normal reseller merchandising practice"
            score={ratings.industryStandard.score}
            max={10}
            reasoning={ratings.industryStandard.reasoning}
            accent="bg-brand-300"
          />
        </>
      ) : (
        <div className="col-span-2 flex items-center rounded-xl border border-dashed border-neutral-300 bg-white p-3 text-xs text-neutral-400">
          Customer-appeal and industry-standard ratings weren&apos;t captured for this audit
          (scored before this feature, or AI scoring failed).
        </div>
      )}
    </div>
  );
}

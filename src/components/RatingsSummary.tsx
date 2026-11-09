type Rating = { score: number; reasoning: string };

function RatingCard({ label, hint, score, reasoning, color }: { label: string; hint: string; score: number; reasoning: string; color: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-brand-950">{label}</span>
        <span className="text-xl font-extrabold tabular-nums text-brand-950">
          {score}
          <span className="text-sm font-normal text-neutral-400">/10</span>
        </span>
      </div>
      <div className="mt-2 flex gap-0.5" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < score ? color : "#e8ecf8" }} />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">{hint}</p>
      <p className="mt-2 text-xs leading-relaxed text-neutral-600">{reasoning}</p>
    </div>
  );
}

/**
 * Two AI judgement calls shown beside the matrix score: a second opinion to
 * read alongside it, never part of any score or ranking.
 */
export function RatingsSummary({ ratings }: { ratings: { customerAppeal: Rating; industryStandard: Rating } | null }) {
  if (!ratings) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <RatingCard
        label="Customer appeal"
        hint="Would a passing customer find it inviting? AI opinion, not ranked."
        score={ratings.customerAppeal.score}
        reasoning={ratings.customerAppeal.reasoning}
        color="#23aeb7"
      />
      <RatingCard
        label="Industry standard"
        hint="Compared with normal reseller merchandising. AI opinion, not ranked."
        score={ratings.industryStandard.score}
        reasoning={ratings.industryStandard.reasoning}
        color="#9b4291"
      />
    </div>
  );
}

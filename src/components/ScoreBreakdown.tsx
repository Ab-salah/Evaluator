import { computeScore, type ElementCounts, type MatrixElementRule } from "@/lib/scoring";

export function ScoreBreakdown({
  title,
  counts,
  rules,
  barClass,
  reasoning,
}: {
  title: string;
  counts: ElementCounts;
  rules: MatrixElementRule[];
  barClass: string;
  reasoning?: Record<string, string>;
}) {
  const breakdown = computeScore(counts, rules);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="px-4 pt-3">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">{title}</span>
          <span className="text-2xl font-semibold">
            {breakdown.totalScore}
            <span className="text-sm font-normal text-neutral-400"> / {breakdown.maxScore}</span>
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${breakdown.percentage}%` }} />
        </div>
      </div>
      <ul className="mt-3 divide-y divide-neutral-100 border-t border-neutral-100">
        {breakdown.lines.map((line) => (
          <li key={line.key} className="flex items-start justify-between gap-3 px-4 py-2 text-sm">
            <div className="min-w-0">
              <div className={line.points > 0 ? "font-medium text-neutral-800" : "text-neutral-400"}>
                {line.label}
              </div>
              <div className="text-xs text-neutral-400">
                {line.detectedCount} detected
                {line.detectedCount > line.countedUnits ? ` (${line.countedUnits} counted, capped)` : ""}
              </div>
              {reasoning?.[line.key] && (
                <div className="mt-0.5 text-xs text-neutral-500">{reasoning[line.key]}</div>
              )}
            </div>
            <div className="shrink-0 font-mono text-neutral-700">
              {line.points} <span className="text-neutral-400">/ {line.cappedMax}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

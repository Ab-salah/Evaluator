import { computeScore, type ElementCounts, type MatrixElementRule } from "@/lib/scoring";

export function ScoreBreakdown({
  counts,
  rules,
}: {
  counts: ElementCounts;
  rules: MatrixElementRule[];
}) {
  const breakdown = computeScore(counts, rules);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-baseline justify-between border-b border-neutral-200 px-4 py-3">
        <span className="text-sm font-medium text-neutral-500">Visibility score</span>
        <span className="text-2xl font-semibold">
          {breakdown.totalScore}
          <span className="text-base font-normal text-neutral-400"> / {breakdown.maxScore}</span>
        </span>
      </div>
      <ul className="divide-y divide-neutral-100">
        {breakdown.lines.map((line) => (
          <li key={line.key} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <div className="font-medium text-neutral-800">{line.label}</div>
              <div className="text-xs text-neutral-400">
                {line.detectedCount} detected
                {line.detectedCount > line.countedUnits ? ` (${line.countedUnits} counted, capped)` : ""}
              </div>
            </div>
            <div className="font-mono text-neutral-700">
              {line.points} <span className="text-neutral-400">/ {line.cappedMax}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

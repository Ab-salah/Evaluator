import { computeScore, type ElementCounts, type MatrixElementRule } from "@/lib/scoring";
import { ScoreRing } from "./ScoreRing";

export function ScoreBreakdown({
  title,
  counts,
  rules,
  color,
  reasoning,
  storedScore,
}: {
  title: string;
  counts: ElementCounts;
  rules: MatrixElementRule[];
  color: string;
  reasoning?: Record<string, string>;
  // The score saved when this was scored/reviewed, which rankings use.
  // Differs from the breakdown only if the matrix has been edited since.
  storedScore?: number;
}) {
  const b = computeScore(counts, rules);

  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
        <ScoreRing value={b.totalScore} max={b.maxScore} size={60} stroke={color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            <h3 className="truncate text-lg font-extrabold text-brand-950">{title}</h3>
          </div>
          <div className="text-sm text-neutral-500">
            <span className="font-extrabold text-brand-950">{b.totalScore}</span> of {b.maxScore} points
          </div>
        </div>
      </div>
      {storedScore !== undefined && storedScore !== b.totalScore && (
        <p className="mx-4 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:mx-5">
          Ranked on <b>{storedScore}</b>, from the matrix in force when it was scored. This breakdown uses today&apos;s
          matrix; saving a review re-scores it.
        </p>
      )}
      <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
        {b.lines.map((line) => {
          const pct = line.cappedMax > 0 ? (line.points / line.cappedMax) * 100 : 0;
          return (
            <li key={line.key} className="px-4 py-2.5 sm:px-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={line.points > 0 ? "font-bold text-brand-950" : "text-neutral-400"}>
                  {line.label}
                  <span className="ml-1.5 text-xs font-normal text-neutral-400">
                    ×{line.detectedCount}
                    {line.detectedCount > line.countedUnits ? ` (capped at ${line.countedUnits})` : ""}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-neutral-700">
                  <b>{line.points}</b>
                  <span className="text-neutral-400"> / {line.cappedMax}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full animate-grow rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
              {reasoning?.[line.key] && <p className="mt-1 text-xs text-neutral-500">{reasoning[line.key]}</p>}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

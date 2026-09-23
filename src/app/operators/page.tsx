import Link from "next/link";
import { prisma } from "@/lib/db";
import { maxScoreFor } from "@/lib/scoring";
import { getMatrixRules } from "@/lib/matrix";

export const dynamic = "force-dynamic";

export default async function OperatorsPage() {
  const [stats, rules] = await Promise.all([
    prisma.submission.groupBy({
      by: ["brand"],
      where: { finalScore: { not: null } },
      _avg: { finalScore: true },
      _max: { finalScore: true },
      _min: { finalScore: true },
      _count: { _all: true },
    }),
    getMatrixRules(),
  ]);

  const maxScore = maxScoreFor(rules);
  const ranked = [...stats].sort((a, b) => (b._avg.finalScore ?? 0) - (a._avg.finalScore ?? 0));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Operator ratings</h1>
        <p className="text-sm text-neutral-500">
          Each brand&apos;s average visibility score across every audited shop — the
          cross-shop view, as opposed to the per-shop rankings on the home page.
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
          No scored submissions yet. Once shops have been audited, operators will be ranked
          here by average score.
        </div>
      ) : (
        <ol className="grid gap-3">
          {ranked.map((row, i) => {
            const avg = Math.round((row._avg.finalScore ?? 0) * 100) / 100;
            const percent = maxScore > 0 ? Math.round((avg / maxScore) * 1000) / 10 : 0;
            return (
              <li
                key={row.brand}
                className="rounded-lg border border-neutral-200 bg-white p-4"
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-semibold text-neutral-400">
                    {i + 1}
                  </span>
                  <Link
                    href={`/?brand=${encodeURIComponent(row.brand)}`}
                    className="flex-1 truncate font-medium hover:underline"
                  >
                    {row.brand}
                  </Link>
                  <span className="text-xs text-neutral-400">
                    {row._count._all} audit{row._count._all === 1 ? "" : "s"}
                  </span>
                  <div className="text-right">
                    <div className="font-mono text-lg font-semibold">{avg}</div>
                    <div className="text-xs text-neutral-400">avg / {maxScore}</div>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-neutral-900"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-neutral-400">
                  <span>Lowest: {Math.round((row._min.finalScore ?? 0) * 100) / 100}</span>
                  <span>{percent}% of max</span>
                  <span>Highest: {Math.round((row._max.finalScore ?? 0) * 100) / 100}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

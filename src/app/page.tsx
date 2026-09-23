import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { maxScoreFor } from "@/lib/scoring";
import { getMatrixRules } from "@/lib/matrix";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const { brand } = await searchParams;

  const [submissions, rules] = await Promise.all([
    prisma.submission.findMany({
      where: brand ? { brand } : undefined,
      include: { shop: true },
      orderBy: [{ finalScore: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    getMatrixRules(),
  ]);
  const maxScore = maxScoreFor(rules);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reseller shop rankings</h1>
          <p className="text-sm text-neutral-500">
            Ranked by visibility score, out of {maxScore} (current matrix)
          </p>
          {brand && (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white">
                {brand}
              </span>
              <Link href="/" className="text-xs text-neutral-500 hover:underline">
                Clear filter
              </Link>
            </div>
          )}
        </div>
        <Link
          href="/submit"
          className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New submission
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
          {brand ? `No submissions for ${brand} yet.` : "No submissions yet. Take the first shop photo to get started."}
        </div>
      ) : (
        <ol className="grid gap-3">
          {submissions.map((s, i) => (
            <li key={s.id}>
              <Link
                href={`/submissions/${s.id}`}
                className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-3 transition-shadow hover:border-neutral-300 hover:shadow-sm"
              >
                <span className="w-6 text-center text-sm font-semibold text-neutral-400">
                  {i + 1}
                </span>
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  <Image src={s.imagePath} alt={s.shop.name} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.shop.name}</div>
                  <div className="truncate text-xs text-neutral-500">
                    <span className="font-medium text-neutral-600">{s.brand}</span>
                    {" · "}
                    {[s.shop.city, s.shop.region].filter(Boolean).join(" · ") || "No location on file"}
                  </div>
                </div>
                <span className="hidden sm:inline-block">
                  <StatusBadge status={s.status} />
                </span>
                <div className="w-16 shrink-0 text-right font-mono text-lg font-semibold">
                  {s.finalScore ?? "—"}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

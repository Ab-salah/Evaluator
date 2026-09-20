import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { MAX_VISIBILITY_SCORE } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SCORED: "bg-blue-100 text-blue-700",
  REVIEWED: "bg-emerald-100 text-emerald-700",
  FLAGGED: "bg-red-100 text-red-700",
};

export default async function Home() {
  const submissions = await prisma.submission.findMany({
    include: { shop: true },
    orderBy: [{ finalScore: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reseller shop rankings</h1>
          <p className="text-sm text-neutral-500">
            Ranked by visibility score, out of {MAX_VISIBILITY_SCORE}
          </p>
        </div>
        <Link
          href="/submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New submission
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
          No submissions yet. Take the first shop photo to get started.
        </div>
      ) : (
        <ol className="grid gap-3">
          {submissions.map((s, i) => (
            <li key={s.id}>
              <Link
                href={`/submissions/${s.id}`}
                className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-3 hover:border-neutral-300"
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
                    {[s.shop.city, s.shop.region].filter(Boolean).join(" · ") || "No location on file"}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status]}`}
                >
                  {s.status}
                </span>
                <div className="w-16 text-right font-mono text-lg font-semibold">
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

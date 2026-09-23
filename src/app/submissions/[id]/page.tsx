import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { RatingsSummary } from "@/components/RatingsSummary";
import { StatusBadge } from "@/components/StatusBadge";
import { BackLink } from "@/components/BackLink";
import { RawDataPanel } from "@/components/RawDataPanel";
import { emptyCounts, maxScoreFor, shareOfVisibility, type ElementCounts } from "@/lib/scoring";
import { getMatrixRules } from "@/lib/matrix";
import { getKnownBrands } from "@/lib/brands";
import { brandColors } from "@/lib/brand-colors";
import { ReviewForm } from "./ReviewForm";

export const dynamic = "force-dynamic";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { shop: true, submittedBy: true, reviewedBy: true, brandScores: true },
  });
  if (!submission) notFound();

  const [rules, knownBrands] = await Promise.all([getMatrixRules(), getKnownBrands()]);
  const colors = brandColors(knownBrands);
  const maxScore = maxScoreFor(rules);

  const brands = submission.brandScores
    .map((b) => ({
      brand: b.brand,
      score: b.finalScore,
      counts: { ...emptyCounts(rules), ...(b.finalCounts as ElementCounts) },
      reasoning: (b.reasoning as Record<string, string> | null) ?? undefined,
    }))
    .sort((a, b) => b.score - a.score);
  const share = shareOfVisibility(brands);
  const total = Math.round(brands.reduce((sum, b) => sum + b.score, 0) * 100) / 100;
  const subjectiveRatings = submission.subjectiveRatings as
    | { customerAppeal: { score: number; reasoning: string }; industryStandard: { score: number; reasoning: string } }
    | null;

  const mapUrl =
    submission.latitude != null && submission.longitude != null
      ? `https://www.google.com/maps?q=${submission.latitude},${submission.longitude}`
      : null;

  return (
    <div>
      <BackLink href="/">Back to dashboard</BackLink>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-4">
          <a
            href={submission.imagePath}
            target="_blank"
            rel="noreferrer"
            title="Open full-size photo"
            className="relative block h-[60vh] max-h-[36rem] w-full overflow-hidden rounded-xl bg-neutral-100"
          >
            <Image
              src={submission.imagePath}
              alt={submission.shop.name}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-contain"
            />
          </a>

          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{submission.shop.name}</h1>
              <StatusBadge status={submission.status} />
            </div>
            <p className="text-neutral-500">
              {[submission.shop.city, submission.shop.region].filter(Boolean).join(" · ") ||
                "No location on file"}
            </p>
            {submission.locationLabel && (
              <p className="text-neutral-500">{submission.locationLabel}</p>
            )}
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                View captured GPS location
              </a>
            )}
            <p className="text-neutral-400">
              Submitted {new Date(submission.capturedAt).toLocaleString()}
              {submission.submittedBy ? ` by ${submission.submittedBy.name}` : ""}
            </p>
          </div>

          {submission.aiSummary && (
            <div className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-700">
              {submission.aiSummary}
              {submission.aiConfidence && (
                <div className="mt-1 text-xs text-neutral-500">AI confidence: {submission.aiConfidence}</div>
              )}
            </div>
          )}

          {share.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Share of visibility</span>
                <span className="text-xs text-neutral-500">total {total} pts</span>
              </div>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-neutral-100">
                {share.map((line) => (
                  <div
                    key={line.brand}
                    className={colors[line.brand]?.bar ?? "bg-neutral-400"}
                    style={{ width: `${line.sharePercent}%` }}
                    title={`${line.brand} ${line.sharePercent}%`}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {share.map((line) => (
                  <li key={line.brand} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${colors[line.brand]?.bar ?? "bg-neutral-400"}`} />
                    <span className="flex-1">{line.brand}</span>
                    <span className="font-mono text-neutral-700">{line.sharePercent}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <RatingsSummary matrixTotal={total} matrixMax={brands.length * maxScore} ratings={subjectiveRatings} />

          {brands.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
              No operator branding has been scored for this photo yet. Use the reviewer form below
              to add operators and their counts.
            </div>
          ) : (
            brands.map((b) => (
              <ScoreBreakdown
                key={b.brand}
                title={b.brand}
                counts={b.counts}
                rules={rules}
                reasoning={b.reasoning}
                barClass={colors[b.brand]?.bar ?? "bg-neutral-400"}
              />
            ))
          )}

          <ReviewForm
            submissionId={submission.id}
            rules={rules}
            maxScore={maxScore}
            knownBrands={knownBrands}
            initialBrands={brands.map((b) => ({ brand: b.brand, counts: b.counts }))}
          />
          {submission.reviewedBy && (
            <p className="text-xs text-neutral-500">
              Last reviewed by {submission.reviewedBy.name}
              {submission.reviewNotes ? ` — "${submission.reviewNotes}"` : ""}
            </p>
          )}

          <RawDataPanel
            data={{
              status: submission.status,
              aiSummary: submission.aiSummary,
              aiConfidence: submission.aiConfidence,
              subjectiveRatings: submission.subjectiveRatings,
              brandScores: submission.brandScores.map((b) => ({
                brand: b.brand,
                aiCounts: b.aiCounts,
                aiScore: b.aiScore,
                reasoning: b.reasoning,
                finalCounts: b.finalCounts,
                finalScore: b.finalScore,
              })),
              location: { latitude: submission.latitude, longitude: submission.longitude },
              capturedAt: submission.capturedAt,
              updatedAt: submission.updatedAt,
            }}
          />
        </div>
      </div>
    </div>
  );
}

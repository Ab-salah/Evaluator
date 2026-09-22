import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { emptyCounts, type BrandShareLine, type ElementCounts } from "@/lib/scoring";
import { getMatrixRules } from "@/lib/matrix";
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
    include: { shop: true, submittedBy: true, reviewedBy: true },
  });
  if (!submission) notFound();

  const rules = await getMatrixRules();
  const storedCounts = (submission.finalElements as { counts?: ElementCounts } | null)?.counts;
  const finalCounts = { ...emptyCounts(rules), ...storedCounts };
  const aiElements = submission.aiElements as {
    counts?: ElementCounts;
    reasoning?: Record<string, string>;
    confidence?: string;
  } | null;
  const share =
    (submission.competitors as { share?: BrandShareLine[] } | null)?.share ?? [];

  const mapUrl =
    submission.latitude != null && submission.longitude != null
      ? `https://www.google.com/maps?q=${submission.latitude},${submission.longitude}`
      : null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-100">
          <Image src={submission.imagePath} alt={submission.shop.name} fill className="object-cover" />
        </div>

        <div className="mt-4 space-y-1 text-sm">
          <h1 className="text-lg font-semibold">{submission.shop.name}</h1>
          <p className="text-neutral-600">
            Audited for <span className="font-medium text-neutral-900">{submission.brand}</span>
          </p>
          <p className="text-neutral-500">
            {[submission.shop.city, submission.shop.region].filter(Boolean).join(" · ") || "—"}
          </p>
          {submission.locationLabel && <p className="text-neutral-500">{submission.locationLabel}</p>}
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              View captured GPS location
            </a>
          )}
          <p className="text-neutral-400">
            Submitted {new Date(submission.capturedAt).toLocaleString()}
            {submission.submittedBy ? ` by ${submission.submittedBy.name}` : ""}
          </p>
          {submission.aiSummary && (
            <p className="mt-2 rounded-md bg-neutral-100 p-3 text-neutral-700">{submission.aiSummary}</p>
          )}
          {aiElements?.confidence && (
            <p className="text-neutral-400">AI confidence: {aiElements.confidence}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <ScoreBreakdown counts={finalCounts} rules={rules} />
        {share.length > 1 && (
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <span className="text-sm font-medium text-neutral-500">Share of visibility</span>
              <p className="mt-0.5 text-xs text-neutral-400">
                All branding scored on the same matrix, from this one photo.
              </p>
            </div>
            <ul className="divide-y divide-neutral-100">
              {share.map((line) => (
                <li key={line.brand} className="px-4 py-2.5 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={
                        line.brand === submission.brand
                          ? "font-medium text-neutral-900"
                          : "text-neutral-600"
                      }
                    >
                      {line.brand}
                      {line.brand === submission.brand && (
                        <span className="ml-1.5 text-xs text-neutral-400">audited</span>
                      )}
                    </span>
                    <span className="font-mono text-neutral-700">
                      {line.sharePercent}%
                      <span className="ml-2 text-xs text-neutral-400">{line.score} pts</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full ${
                        line.brand === submission.brand ? "bg-neutral-900" : "bg-neutral-300"
                      }`}
                      style={{ width: `${line.sharePercent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ReviewForm submissionId={submission.id} initialCounts={finalCounts} rules={rules} />
        {submission.reviewedBy && (
          <p className="text-xs text-neutral-500">
            Last reviewed by {submission.reviewedBy.name}
            {submission.reviewNotes ? ` — "${submission.reviewNotes}"` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { emptyCounts, type ElementCounts } from "@/lib/scoring";
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

  const finalCounts =
    ((submission.finalElements as { counts?: ElementCounts } | null)?.counts) ?? emptyCounts();
  const aiElements = submission.aiElements as {
    counts?: ElementCounts;
    reasoning?: Record<string, string>;
    confidence?: string;
  } | null;

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
        <ScoreBreakdown counts={finalCounts} />
        <ReviewForm submissionId={submission.id} initialCounts={finalCounts} />
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai-vision";
import { emptyCounts, maxScoreFor, shareOfVisibility, type ElementCounts } from "@/lib/scoring";
import { getMatrixRules } from "@/lib/matrix";
import { getKnownBrands } from "@/lib/brands";
import { brandColors, colorFor } from "@/lib/brand-colors";
import { isStuck, UNNAMED_SHOP } from "@/lib/scoring-job";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { RatingsSummary } from "@/components/RatingsSummary";
import { StatusBadge } from "@/components/StatusBadge";
import { RawDataPanel } from "@/components/RawDataPanel";
import { btn, Card, CardHeader, EmptyState, Icon, Notice, PageHeader, Photo } from "@/components/ui";
import { ReviewForm } from "./ReviewForm";
import { ScoringProgress } from "./ScoringProgress";
import { AdminActions } from "./AdminActions";

export const metadata: Metadata = { title: "Audit" };
export const dynamic = "force-dynamic";

export default async function SubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const [{ id }, { new: justSubmitted }, user] = await Promise.all([params, searchParams, requireUser()]);
  const isAdmin = user.role === "ADMIN";
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { shop: true, submittedBy: true, reviewedBy: true, brandScores: true },
  });
  if (!submission || (!isAdmin && submission.submittedById !== user.id)) notFound();

  const [rules, knownBrands] = await Promise.all([getMatrixRules(), getKnownBrands()]);
  const colors = brandColors(knownBrands);
  const maxScore = maxScoreFor(rules);

  const brands = submission.brandScores
    .map((b) => ({
      brand: b.brand,
      score: b.finalScore,
      counts: { ...emptyCounts(rules), ...(b.finalCounts as ElementCounts) },
      aiCounts: b.aiCounts as ElementCounts | null,
      reasoning: (b.reasoning as Record<string, string> | null) ?? undefined,
    }))
    .sort((a, b) => b.score - a.score);
  const share = shareOfVisibility(brands);
  const total = Math.round(brands.reduce((sum, b) => sum + b.score, 0) * 100) / 100;
  const ratings = submission.subjectiveRatings as
    | { customerAppeal: { score: number; reasoning: string }; industryStandard: { score: number; reasoning: string } }
    | null;

  const pending = submission.status === "PENDING";
  const stuck = isStuck(submission.status, submission.createdAt);
  const unnamed = submission.shop.name === UNNAMED_SHOP;
  const location = [submission.locationLabel, submission.shop.city, submission.shop.region].filter(Boolean).join(" · ");
  const mapUrl =
    submission.latitude != null && submission.longitude != null
      ? `https://www.google.com/maps?q=${submission.latitude},${submission.longitude}`
      : null;
  const aiOn = await aiEnabled();

  return (
    <div>
      <PageHeader
        back={isAdmin ? { href: "/review", label: "Review queue" } : { href: "/audits", label: "My audits" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {unnamed ? <span className="text-neutral-400">{pending ? "Reading shop name…" : UNNAMED_SHOP}</span> : submission.shop.name}
            <StatusBadge status={submission.status} audience={isAdmin ? "admin" : "user"} />
          </span>
        }
        subtitle={
          <>
            {submission.capturedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            {submission.submittedBy ? ` · by ${submission.submittedBy.name}` : ""}
          </>
        }
        action={isAdmin ? <AdminActions id={submission.id} aiOn={aiOn} canRescore={!pending || stuck} /> : undefined}
      />

      {justSubmitted && (
        <div className="mb-4">
          <Notice
            tone="success"
            title="Audit submitted"
            action={
              <Link href="/submit" className={btn.secondary}>
                <Icon name="camera" className="h-4 w-4" /> Next shop
              </Link>
            }
          >
            {pending ? "It's being scored now. This page updates by itself." : "Thanks, the photo is saved."}
          </Notice>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Photo & facts */}
        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <a href={submission.imagePath} target="_blank" rel="noreferrer" title="Open full-size photo" className="group relative block overflow-hidden rounded-2xl bg-brand-950">
            <Photo src={submission.imagePath} alt={submission.shop.name} className="max-h-[45vh] w-full object-contain transition group-hover:opacity-90 lg:max-h-[70vh]" />
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100">
              Open full size
            </span>
          </a>
          <Card className="divide-y divide-neutral-100 text-sm">
            <div className="flex items-center gap-3 px-4 py-3">
              <Icon name="map-pin" className="h-4 w-4 text-neutral-400" />
              <span className="flex-1 text-neutral-700">{location || "No location details"}</span>
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noreferrer" className="font-bold text-brand-700 hover:underline">
                  Map
                </a>
              )}
            </div>
            {submission.shop.code && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Icon name="store" className="h-4 w-4 text-neutral-400" />
                <span className="text-neutral-700">Shop code {submission.shop.code}</span>
              </div>
            )}
            {submission.reviewedBy && (
              <div className="flex items-start gap-3 px-4 py-3">
                <Icon name="check-circle" className="mt-0.5 h-4 w-4 text-emerald-600" />
                <span className="text-neutral-700">
                  Confirmed by <b>{submission.reviewedBy.name}</b>
                  {submission.reviewedAt && ` on ${submission.reviewedAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}`}
                  {submission.reviewNotes && <span className="mt-1 block text-neutral-500">&ldquo;{submission.reviewNotes}&rdquo;</span>}
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Scores */}
        <div className="space-y-4">
          {pending && !stuck && <ScoringProgress id={submission.id} />}
          {stuck && (
            <Notice tone="warn" title="Scoring didn't finish">
              This photo has been waiting for more than 10 minutes (the server may have restarted).
              {isAdmin ? " Use “Re-run AI” above, or score it manually below." : " An admin has been alerted in the review queue."}
            </Notice>
          )}
          {submission.status === "FLAGGED" && (
            <Notice tone={isAdmin ? "error" : "info"} title={isAdmin ? "Needs a manual score" : "With an admin for scoring"}>
              {isAdmin
                ? submission.aiSummary ?? "Automatic scoring did not complete."
                : "Automatic scoring couldn't finish for this photo, so an admin will score it. Nothing else is needed from you."}
            </Notice>
          )}
          {isAdmin && submission.status === "SCORED" && (
            <Notice tone="warn" title="Check the AI's counts">
              Compare the counts with the photo, then confirm them or correct them below.
              {submission.aiConfidence === "low" && " The AI flagged its own confidence as low for this photo."}
            </Notice>
          )}

          {brands.length > 0 && (
            <Card>
              <CardHeader
                title="Share of visibility"
                subtitle={`${brands.length} operator${brands.length === 1 ? "" : "s"} found · ${total} points in total`}
                action={
                  submission.aiConfidence && (
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold capitalize text-brand-700">
                      AI confidence: {submission.aiConfidence}
                    </span>
                  )
                }
              />
              <div className="p-4 sm:p-5">
                <div className="flex h-4 overflow-hidden rounded-full bg-neutral-100">
                  {share.map((line) => (
                    <div
                      key={line.brand}
                      className="h-full animate-grow first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${line.sharePercent}%`, background: colorFor(colors, line.brand) }}
                      title={`${line.brand} ${line.sharePercent}%`}
                    />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                  {share.map((line) => (
                    <li key={line.brand} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(colors, line.brand) }} />
                      <b className="text-brand-950">{line.brand}</b>
                      <span className="tabular-nums text-neutral-500">
                        {line.score} pts · {line.sharePercent}%
                      </span>
                    </li>
                  ))}
                </ul>
                {submission.aiSummary && submission.status !== "FLAGGED" && (
                  <p className="mt-4 rounded-xl bg-canvas px-3.5 py-3 text-sm leading-relaxed text-neutral-700">
                    <Icon name="sparkles" className="mr-1.5 inline h-4 w-4 text-zain-teal" />
                    {submission.aiSummary}
                  </p>
                )}
              </div>
            </Card>
          )}

          {!pending && brands.length === 0 && submission.status !== "FLAGGED" && (
            <Card>
              <EmptyState icon="search" title="No operator branding found">
                Nothing was scored for this photo.{isAdmin ? " If that's wrong, add the operators below." : ""}
              </EmptyState>
            </Card>
          )}

          {isAdmin && !(pending && !stuck) && (
            <ReviewForm
              submissionId={submission.id}
              rules={rules}
              maxScore={maxScore}
              knownBrands={knownBrands}
              shopName={unnamed ? "" : submission.shop.name}
              status={submission.status}
              initialBrands={brands.map((b) => ({ brand: b.brand, counts: b.counts, aiCounts: b.aiCounts }))}
            />
          )}

          {brands.map((b) => (
            <ScoreBreakdown
              key={b.brand}
              title={b.brand}
              counts={b.counts}
              rules={rules}
              reasoning={b.reasoning}
              storedScore={b.score}
              color={colorFor(colors, b.brand)}
            />
          ))}

          <RatingsSummary ratings={ratings} />

          {isAdmin && (
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
          )}
        </div>
      </div>
    </div>
  );
}

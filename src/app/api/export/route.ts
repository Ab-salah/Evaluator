import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { getMatrixRules } from "@/lib/matrix";
import { auditWhere, parseAuditFilter } from "@/lib/audit-filter";
import { computeScore, shareOfVisibility, type ElementCounts } from "@/lib/scoring";
import { actionPlan, HOME_BRAND } from "@/lib/action-plan";
import { plain } from "@/lib/ai-vision";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Scoring",
  SCORED: "Needs check",
  FLAGGED: "Manual",
  REVIEWED: "Confirmed",
};

/** Quotes a value for CSV, and defuses spreadsheet formulas (=, +, -, @) in free text. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? plain(value) : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const BOM = String.fromCharCode(0xfeff);

type Rating = { score?: number } | undefined;

/**
 * CSV of scored audits, one row per operator per photo, matching the
 * filters on the Audits page. Opens directly in Excel (UTF-8 with BOM, so
 * Arabic shop names survive). Field users get only their own audits.
 */
export async function GET(req: NextRequest) {
  const auth = await apiUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  const sp = req.nextUrl.searchParams;
  const filter = parseAuditFilter(user, { q: sp.get("q"), status: sp.get("status"), mine: sp.get("mine") });
  const where = auditWhere(user, filter);
  // Exports are for finished scores: audits still being scored have nothing to export.
  const scoredOnly = { AND: [where, { status: { not: "PENDING" as const } }] };

  const [rules, items] = await Promise.all([
    getMatrixRules(),
    prisma.submission.findMany({
      where: scoredOnly,
      include: {
        shop: true,
        submittedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
        brandScores: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20_000,
    }),
  ]);

  const header = [
    "Audit ID",
    "Audit date",
    "Shop",
    "Shop code",
    "City",
    "Region",
    "Location",
    "Latitude",
    "Longitude",
    "Submitted by",
    "Status",
    "Operator",
    "Score",
    "Max score",
    "Score %",
    "Share of visibility %",
    "Rank at shop",
    "Operators at shop",
    ...rules.map((r) => `${r.label} (count)`),
    `${HOME_BRAND} gap to leader`,
    `${HOME_BRAND} items to take the lead`,
    "AI confidence",
    "Customer appeal (1-10)",
    "Industry standard (1-10)",
    "Reviewed by",
    "Reviewed at",
    "Review notes",
    "AI summary",
  ];

  const lines: string[] = [header.map(cell).join(",")];

  for (const a of items) {
    const brands = a.brandScores.map((b) => ({
      brand: b.brand,
      score: b.finalScore,
      counts: (b.finalCounts ?? {}) as ElementCounts,
    }));
    const shares = shareOfVisibility(brands);
    const plan = actionPlan(brands, rules);
    const ratings = (a.subjectiveRatings ?? {}) as { customerAppeal?: Rating; industryStandard?: Rating };
    const homeGap = plan.leading ? 0 : plan.gapToLead;
    const toLead = !plan.present && !plan.rival
      ? "No branding found"
      : plan.leading
      ? "Leading"
      : plan.toLead
        ? plan.toLead.map((t) => `${t.add} x ${t.label}`).join("; ")
        : "Cannot overtake with a full set";

    const base = [
      a.id,
      a.createdAt.toISOString().slice(0, 16).replace("T", " "),
      a.shop.name,
      a.shop.code,
      a.shop.city,
      a.shop.region,
      a.locationLabel,
      a.latitude,
      a.longitude,
      a.submittedBy?.name,
      STATUS_LABEL[a.status] ?? a.status,
    ];
    const tail = [
      homeGap,
      toLead,
      a.aiConfidence,
      ratings.customerAppeal?.score,
      ratings.industryStandard?.score,
      a.reviewedBy?.name,
      a.reviewedAt ? a.reviewedAt.toISOString().slice(0, 16).replace("T", " ") : null,
      a.reviewNotes,
      a.aiSummary,
    ];

    if (shares.length === 0) {
      // Keep audits with no branding found, so counts per shop stay honest.
      lines.push([...base, "(no branding found)", 0, plan.maxScore, 0, 0, null, 0, ...rules.map(() => 0), ...tail].map(cell).join(","));
      continue;
    }

    shares.forEach((s, i) => {
      const b = brands.find((x) => x.brand === s.brand)!;
      const breakdown = computeScore(b.counts, rules);
      lines.push(
        [
          ...base,
          s.brand,
          s.score,
          breakdown.maxScore,
          breakdown.maxScore > 0 ? Math.round((s.score / breakdown.maxScore) * 1000) / 10 : 0,
          s.sharePercent,
          i + 1,
          shares.length,
          ...rules.map((r) => b.counts[r.key] ?? 0),
          ...tail,
        ]
          .map(cell)
          .join(","),
      );
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(BOM + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="visibility-audits-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "./auth";

export const AUDIT_STATUSES = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Scoring" },
  { key: "SCORED", label: "Needs check" },
  { key: "FLAGGED", label: "Manual" },
  { key: "REVIEWED", label: "Confirmed" },
] as const;

export type AuditFilter = { q: string; status: string; mine: boolean };

/** Reads the audit list's search parameters. Field users only ever see their own audits. */
export function parseAuditFilter(user: CurrentUser, sp: { q?: string | null; status?: string | null; mine?: string | null }): AuditFilter {
  const status = AUDIT_STATUSES.some((s) => s.key === sp.status) ? (sp.status ?? "") : "";
  return {
    q: sp.q?.trim() ?? "",
    status,
    mine: user.role !== "ADMIN" || sp.mine === "1",
  };
}

/** The same filter for the audit list and the export, so the file matches what is on screen. */
export function auditWhere(user: CurrentUser, f: AuditFilter): Prisma.SubmissionWhereInput {
  return {
    ...(f.mine ? { submittedById: user.id } : {}),
    ...(f.status ? { status: f.status as Prisma.EnumSubmissionStatusFilter["equals"] } : {}),
    ...(f.q
      ? {
          OR: [
            { shop: { name: { contains: f.q, mode: "insensitive" } } },
            { shop: { city: { contains: f.q, mode: "insensitive" } } },
            { shop: { code: { contains: f.q, mode: "insensitive" } } },
            { brandScores: { some: { brand: { contains: f.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}

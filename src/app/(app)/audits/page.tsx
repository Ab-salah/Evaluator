import type { Metadata } from "next";
import Link from "next/link";
import { AUDIT_STATUSES, auditWhere, parseAuditFilter } from "@/lib/audit-filter";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getKnownBrands } from "@/lib/brands";
import { brandColors } from "@/lib/brand-colors";
import { AuditRow } from "@/components/AuditRow";
import { btn, Card, EmptyState, Icon, input, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Audits" };
export const dynamic = "force-dynamic";

const PAGE = 30;
const STATUSES = AUDIT_STATUSES;

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; mine?: string; page?: string }>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;
  const filter = parseAuditFilter(user, sp);
  const { q, status, mine } = filter;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = auditWhere(user, filter);

  const [items, count, knownBrands] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: { shop: true, submittedBy: { select: { name: true } }, brandScores: { select: { brand: true, finalScore: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
    }),
    prisma.submission.count({ where }),
    getKnownBrands(),
  ]);
  const colors = brandColors(knownBrands);
  const pages = Math.max(1, Math.ceil(count / PAGE));

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q || undefined, status: status || undefined, mine: isAdmin && mine ? "1" : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/audits${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title={isAdmin && !mine ? "All audits" : "My audits"}
        subtitle={`${count} audit${count === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}`}
        action={
          <div className="flex gap-2">
            {count > 0 && (
              <a
                href={href({ page: undefined }).replace("/audits", "/api/export")}
                className={btn.secondary}
                title="Download the scored audits in this list as a spreadsheet (CSV, opens in Excel)"
                download
              >
                <Icon name="download" className="h-4 w-4" /> Export
              </a>
            )}
            <Link href="/submit" className={btn.primary}>
              <Icon name="camera" className="h-4 w-4" /> New audit
            </Link>
          </div>
        }
      />

      <div className="mb-4 space-y-3">
        <form action="/audits" className="relative">
          {status && <input type="hidden" name="status" value={status} />}
          {isAdmin && mine && <input type="hidden" name="mine" value="1" />}
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-neutral-400" />
          <input name="q" defaultValue={q} placeholder="Search shop, city, code or operator" className={`${input} pl-11`} />
        </form>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {STATUSES.map((s) => (
            <Link
              key={s.key}
              href={href({ status: s.key || undefined, page: undefined })}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                status === s.key ? "bg-brand-700 text-white" : "bg-white text-brand-900 ring-1 ring-neutral-200 hover:bg-brand-50"
              }`}
            >
              {s.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href={href({ mine: mine ? undefined : "1", page: undefined })}
              className={`ml-auto whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                mine ? "bg-zain-teal text-white" : "bg-white text-brand-900 ring-1 ring-neutral-200 hover:bg-brand-50"
              }`}
            >
              Only mine
            </Link>
          )}
        </div>
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon="camera"
            title={q || status ? "No audits match" : "No audits yet"}
            action={
              q || status ? (
                <Link href={href({ q: undefined, status: undefined, page: undefined })} className={btn.secondary}>
                  Clear filters
                </Link>
              ) : (
                <Link href="/submit" className={btn.primary}>
                  Start your first audit
                </Link>
              )
            }
          >
            {q || status ? "Try a different search or filter." : "Photograph a reseller shop front to get started."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {items.map((a) => (
              <AuditRow key={a.id} a={a} colors={colors} audience={isAdmin ? "admin" : "user"} showSubmitter={isAdmin && !mine} />
            ))}
          </ul>
        )}
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={href({ page: String(page - 1) })} className={btn.secondary}>
              <Icon name="chevron-left" className="h-4 w-4" /> Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-neutral-500">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={href({ page: String(page + 1) })} className={btn.secondary}>
              Older <Icon name="chevron-right" className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}

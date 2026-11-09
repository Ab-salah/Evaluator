import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { Icon, Photo } from "./ui";
import { UNNAMED_SHOP } from "@/lib/scoring-job";

export type AuditRowData = {
  id: string;
  imagePath: string;
  status: string;
  capturedAt: Date;
  aiConfidence?: string | null;
  aiSummary?: string | null;
  shop: { name: string; city?: string | null };
  submittedBy?: { name: string } | null;
  brandScores: { brand: string; finalScore: number }[];
};

function timeAgo(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function AuditRow({
  a,
  colors,
  audience = "admin",
  showSubmitter = true,
  note,
}: {
  a: AuditRowData;
  colors: Record<string, string>;
  audience?: "admin" | "user";
  showSubmitter?: boolean;
  note?: React.ReactNode;
}) {
  const total = Math.round(a.brandScores.reduce((s, b) => s + b.finalScore, 0) * 100) / 100;
  const brands = [...a.brandScores].sort((x, y) => y.finalScore - x.finalScore);
  return (
    <li>
      <Link href={`/submissions/${a.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/60 sm:px-5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
          <Photo src={a.imagePath} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`truncate font-extrabold ${a.shop.name === UNNAMED_SHOP ? "text-neutral-400" : "text-brand-950"}`}>
              {a.shop.name}
            </span>
            <StatusBadge status={a.status} audience={audience} />
            {a.status === "SCORED" && a.aiConfidence === "low" && audience === "admin" && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">Low confidence</span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-neutral-500">
            {timeAgo(a.capturedAt)}
            {showSubmitter && a.submittedBy ? ` · ${a.submittedBy.name}` : ""}
            {a.shop.city ? ` · ${a.shop.city}` : ""}
          </div>
          {note ? (
            <div className="mt-1 line-clamp-2 text-xs text-red-700">{note}</div>
          ) : (
            brands.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {brands.map((b) => (
                  <span
                    key={b.brand}
                    className="inline-flex items-center gap-1 rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-bold text-brand-900"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors[b.brand] ?? "#8a93b3" }} />
                    {b.brand} {b.finalScore}
                  </span>
                ))}
              </div>
            )
          )}
        </div>
        {brands.length > 0 && (
          <div className="hidden shrink-0 text-right sm:block">
            <div className="text-xl font-extrabold tabular-nums text-brand-700">{total}</div>
            <div className="text-[11px] text-neutral-400">total pts</div>
          </div>
        )}
        <Icon name="chevron-right" className="h-5 w-5 shrink-0 text-neutral-300" />
      </Link>
    </li>
  );
}

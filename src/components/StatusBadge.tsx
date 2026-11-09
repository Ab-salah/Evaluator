const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING: { label: "Scoring…", cls: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500 animate-pulse" },
  SCORED: { label: "Needs check", cls: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  REVIEWED: { label: "Confirmed", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  FLAGGED: { label: "Needs manual score", cls: "bg-red-50 text-red-800 ring-red-200", dot: "bg-red-500" },
};

const USER_LABELS: Record<string, string> = { SCORED: "Scored", FLAGGED: "With admin" };

/** Status in plain words; field users see "Scored" rather than an admin to-do. */
export function StatusBadge({ status, audience = "admin" }: { status: string; audience?: "admin" | "user" }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-neutral-100 text-neutral-700 ring-neutral-200", dot: "bg-neutral-400" };
  const text = audience === "user" ? (USER_LABELS[status] ?? s.label) : s.label;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {text}
    </span>
  );
}

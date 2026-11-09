/** A circular score gauge: `value` out of `max`, drawn in `stroke`. */
export function ScoreRing({
  value,
  max,
  size = 72,
  stroke = "#344c98",
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: string;
}) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value} out of ${max}`}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e8ecf8" strokeWidth="3.2" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
          style={{ transition: "stroke-dasharray .8s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-extrabold leading-none text-brand-950" style={{ fontSize: size * 0.26 }}>
        {Math.round(pct * 100)}
        <span style={{ fontSize: size * 0.14 }}>%</span>
      </div>
    </div>
  );
}

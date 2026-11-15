"use client";

import { useEffect, useRef, useState } from "react";

export type TrendSeries = { name: string; color: string; values: (number | null)[] };

const H = 200; // plot height
const PAD = { top: 12, right: 92, bottom: 26, left: 34 };
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Axis top and tick step: the ticks always reach the top of the plot. */
function scale(v: number) {
  const raw = Math.max(1, v * 1.08);
  const step = raw <= 30 ? 5 : 10;
  return { max: Math.ceil(raw / step) * step, step };
}

/**
 * Line chart for a score over time: one 2px line per operator in its brand
 * colour, a legend, end labels when they don't collide, a crosshair with a
 * tooltip (pointer and keyboard), and the same numbers as a table.
 */
export function TrendChart({
  labels,
  series,
  unit = "pts",
  caption,
}: {
  /** One label per point on the x axis, e.g. "12 Oct". */
  labels: string[];
  series: TrendSeries[];
  unit?: string;
  caption: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = labels.length;
  const { max, step } = scale(Math.max(0, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null))));
  const plotW = width - PAD.left - PAD.right;
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + H - (v / max) * H;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  // Thin the x labels on narrow screens so they never overlap.
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 64))));

  const paths = series.map((s) => {
    let d = "";
    let pen = false;
    s.values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  });

  // End labels: last value of each series, dropped if any two would collide.
  const ends = series
    .map((s) => {
      const i = s.values.findLastIndex((v) => v !== null);
      return i < 0 ? null : { name: s.name, color: s.color, i, v: s.values[i]!, py: y(s.values[i]!) };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.py - b.py);
  const endLabels = ends.every((e, k) => k === 0 || e.py - ends[k - 1].py >= 15);

  function pick(clientX: number) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const px = clientX - rect.left;
    const i = n <= 1 ? 0 : Math.round(((px - PAD.left) / plotW) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  const tipLeft = active === null ? 0 : Math.min(Math.max(x(active) + 12, 8), width - 168);

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-brand-900" aria-label="Legend">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>

      <div
        ref={box}
        className="relative touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        tabIndex={0}
        role="img"
        aria-label={caption}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
          else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
          else if (e.key === "Escape") setActive(null);
          else return;
          e.preventDefault();
        }}
      >
        <svg width="100%" height={H + PAD.top + PAD.bottom} viewBox={`0 0 ${width} ${H + PAD.top + PAD.bottom}`} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right + 8} y1={y(t)} y2={y(t)} stroke="#eceef3" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#8a93b3" className="tabular-nums">
                {t}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % every === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={H + PAD.top + 18} textAnchor="middle" fontSize={11} fill="#8a93b3">
                {l}
              </text>
            ) : null,
          )}

          {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + H} stroke="#c5cbe0" strokeWidth={1} />}

          {series.map((s, k) => (
            <path key={s.name} d={paths[k]} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {/* End markers, plus every series' point at the crosshair */}
          {ends.map((e) => (
            <circle key={e.name} cx={x(e.i)} cy={e.py} r={4} fill={e.color} stroke="#ffffff" strokeWidth={2} />
          ))}
          {active !== null &&
            series.map((s) =>
              s.values[active] === null ? null : (
                <circle key={s.name} cx={x(active)} cy={y(s.values[active]!)} r={4.5} fill={s.color} stroke="#ffffff" strokeWidth={2} />
              ),
            )}

          {endLabels &&
            ends.map((e) => (
              <text key={e.name} x={x(e.i) + 9} y={e.py} dominantBaseline="middle" fontSize={12} fontWeight={700} fill="#1a1438">
                {e.name} <tspan fontWeight={400} fill="#5b6280">{fmt(e.v)}</tspan>
              </text>
            ))}
        </svg>

        {active !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-40 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: tipLeft }}
          >
            <div className="mb-1 font-bold text-neutral-500">{labels[active]}</div>
            {[...series]
              .sort((a, b) => (b.values[active] ?? -1) - (a.values[active] ?? -1))
              .map((s) => (
                <div key={s.name} className="flex items-center gap-2 py-0.5">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                  <span className="font-extrabold tabular-nums text-brand-950">{s.values[active] === null ? "n/a" : fmt(s.values[active]!)}</span>
                  <span className="text-neutral-500">{s.name}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <details className="mt-2 text-xs text-neutral-600">
        <summary className="cursor-pointer font-bold text-brand-700">Show the numbers</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left tabular-nums">
            <thead>
              <tr className="text-neutral-500">
                <th className="py-1 pr-3 font-bold">Date</th>
                {series.map((s) => (
                  <th key={s.name} className="py-1 pr-3 font-bold">
                    {s.name} ({unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="py-1 pr-3">{l}</td>
                  {series.map((s) => (
                    <td key={s.name} className="py-1 pr-3">
                      {s.values[i] === null ? "n/a" : fmt(s.values[i]!)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

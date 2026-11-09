"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, Icon, Spinner } from "@/components/ui";

const STEPS = ["Photo uploaded", "Finding every operator's branding", "Counting signage, stickers, posters & strips", "Scoring against the matrix"];

/** Polls the audit's status while AI scoring runs, and refreshes the page when it lands. */
export function ScoringProgress({ id }: { id: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/submissions/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const { status } = await res.json();
        if (status !== "PENDING") router.refresh();
      } catch {
        // Network blip: try again on the next tick.
      }
    }, 3000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [id, router]);

  // Steps advance on a rough timeline so the wait feels alive; the page
  // refreshes the moment the real result is stored.
  const active = elapsed < 2 ? 1 : elapsed < 20 ? 1 : elapsed < 45 ? 2 : 3;

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-midnight px-5 py-5 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 bg-zain-pattern opacity-30 mix-blend-screen" />
        <div className="relative flex items-center gap-3">
          <Spinner className="h-5 w-5 text-zain-lime" />
          <div>
            <div className="text-lg font-extrabold">Scoring this photo…</div>
            <div className="text-xs text-white/70">Usually under a minute · {elapsed}s so far</div>
          </div>
        </div>
      </div>
      <ol className="space-y-2.5 px-5 py-4 text-sm">
        {STEPS.map((step, i) => (
          <li key={step} className={`flex items-center gap-3 ${i > active ? "text-neutral-400" : "text-brand-950"}`}>
            {i < active ? (
              <Icon name="check-circle" className="h-5 w-5 text-emerald-500" />
            ) : i === active ? (
              <Spinner className="mx-0.5 h-4 w-4 text-brand-700" />
            ) : (
              <span className="mx-1.5 h-2 w-2 rounded-full bg-neutral-300" />
            )}
            <span className={i === active ? "font-bold" : ""}>{step}</span>
          </li>
        ))}
      </ol>
      <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
        You don&apos;t need to wait here — the result will be on this audit when it&apos;s done.
      </p>
    </Card>
  );
}

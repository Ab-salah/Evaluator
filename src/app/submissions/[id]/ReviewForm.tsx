"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ElementCounts, MatrixElementRule } from "@/lib/scoring";

export function ReviewForm({
  submissionId,
  initialCounts,
  rules,
}: {
  submissionId: string;
  initialCounts: ElementCounts;
  rules: MatrixElementRule[];
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<ElementCounts>(initialCounts);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setError(null);
    if (!reviewerEmail) {
      setError("Enter your email to save a correction.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts, reviewerName, reviewerEmail, reviewNotes }),
      });
      const data = await res.json();
      if (res.status >= 400) throw new Error(data.error ?? "Could not save correction");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="rounded-lg border border-neutral-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium">
        Reviewer: correct the element counts
      </summary>

      <div className="mt-4 space-y-3">
        {rules.map((rule) => (
          <div key={rule.key} className="flex items-center justify-between gap-3">
            <label htmlFor={`count-${rule.key}`} className="text-sm text-neutral-700">
              {rule.label}
              <span className="ml-1 text-xs text-neutral-400">(max {rule.maxUnits})</span>
            </label>
            <input
              id={`count-${rule.key}`}
              type="number"
              min={0}
              value={counts[rule.key] ?? 0}
              onChange={(e) =>
                setCounts((c) => ({ ...c, [rule.key]: Math.max(0, Number(e.target.value)) }))
              }
              className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-right text-sm"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 pt-3">
          <input
            placeholder="Your name"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Your email"
            type="email"
            value={reviewerEmail}
            onChange={(e) => setReviewerEmail(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <textarea
          placeholder="Notes (optional)"
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          rows={2}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save correction"}
        </button>
      </div>
    </details>
  );
}

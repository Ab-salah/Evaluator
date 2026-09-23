"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  computeScore,
  emptyCounts,
  type ElementCounts,
  type MatrixElementRule,
} from "@/lib/scoring";
import { readJson } from "@/lib/read-json";

type Row = { brand: string; counts: ElementCounts };

export function ReviewForm({
  submissionId,
  rules,
  maxScore,
  knownBrands,
  initialBrands,
}: {
  submissionId: string;
  rules: MatrixElementRule[];
  maxScore: number;
  knownBrands: string[];
  initialBrands: Row[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initialBrands);
  const [newBrand, setNewBrand] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setCount(brand: string, key: string, value: number) {
    setSaved(false);
    setRows((rs) =>
      rs.map((r) => (r.brand === brand ? { ...r, counts: { ...r.counts, [key]: Math.max(0, value) } } : r)),
    );
  }

  function addBrand() {
    const name = newBrand.trim();
    if (!name) return;
    if (rows.some((r) => r.brand.toLowerCase() === name.toLowerCase())) {
      setError(`${name} is already listed.`);
      return;
    }
    setError(null);
    setSaved(false);
    setRows((rs) => [...rs, { brand: name, counts: emptyCounts(rules) }]);
    setNewBrand("");
  }

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
        body: JSON.stringify({ brands: rows, reviewerName, reviewerEmail, reviewNotes }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? `Could not save correction (${res.status})`);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="rounded-xl border border-neutral-200 bg-white" open={initialBrands.length === 0}>
      <summary className="cursor-pointer px-4 py-3 font-medium">Reviewer: correct the scores</summary>

      <div className="space-y-4 border-t border-neutral-100 p-4">
        {rows.map((row) => {
          const score = computeScore(row.counts, rules).totalScore;
          return (
            <div key={row.brand} className="rounded-lg border border-neutral-200">
              <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
                <span className="font-medium">{row.brand}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    {score} <span className="text-neutral-400">/ {maxScore}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSaved(false);
                      setRows((rs) => rs.filter((r) => r.brand !== row.brand));
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 sm:grid-cols-3">
                {rules.map((rule) => (
                  <label key={rule.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-neutral-600">
                      {rule.label}
                      <span className="ml-1 text-xs text-neutral-400">≤{rule.maxUnits}</span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={row.counts[rule.key] ?? 0}
                      onChange={(e) => setCount(row.brand, rule.key, Number(e.target.value))}
                      className="w-14 rounded-md border border-neutral-300 px-1.5 py-1 text-right text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex gap-2">
          <input
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBrand();
              }
            }}
            list="review-known-brands"
            placeholder="Add an operator the AI missed…"
            className="flex-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
          />
          <datalist id="review-known-brands">
            {knownBrands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={addBrand}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
          >
            Add
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4">
          <input
            placeholder="Your name"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
          />
          <input
            placeholder="Your email"
            type="email"
            value={reviewerEmail}
            onChange={(e) => setReviewerEmail(e.target.value)}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <textarea
          placeholder="Notes (optional)"
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
          rows={2}
        />

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {saved && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>}

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save correction"}
        </button>
      </div>
    </details>
  );
}

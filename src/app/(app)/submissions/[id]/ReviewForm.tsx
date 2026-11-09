"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { computeScore, emptyCounts, type ElementCounts, type MatrixElementRule } from "@/lib/scoring";
import { readJson } from "@/lib/read-json";
import { btn, Card, CardHeader, Icon, input, label, Notice, Spinner } from "@/components/ui";
import { brandColors } from "@/lib/brand-colors";

type Row = { brand: string; counts: ElementCounts; aiCounts?: ElementCounts | null };

function Stepper({
  value,
  onChange,
  max,
  changed,
  name,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
  changed: boolean;
  name: string;
}) {
  const cls = "flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-brand-800 hover:bg-brand-50 disabled:opacity-30";
  return (
    <div className={`flex items-center rounded-xl border ${changed ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}>
      <button type="button" aria-label={`Fewer ${name}`} className={cls} disabled={value <= 0} onClick={() => onChange(value - 1)}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        aria-label={name}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-9 bg-transparent text-center text-sm font-extrabold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" aria-label={`More ${name}`} className={cls} onClick={() => onChange(value + 1)} title={value >= max ? `Only ${max} count toward the score` : undefined}>
        +
      </button>
    </div>
  );
}

export function ReviewForm({
  submissionId,
  rules,
  maxScore,
  knownBrands,
  shopName: initialShopName,
  status,
  initialBrands,
}: {
  submissionId: string;
  rules: MatrixElementRule[];
  maxScore: number;
  knownBrands: string[];
  shopName: string;
  status: string;
  initialBrands: Row[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initialBrands);
  const [shopName, setShopName] = useState(initialShopName);
  const [newBrand, setNewBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(status === "FLAGGED" || initialBrands.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = brandColors([...knownBrands, ...rows.map((r) => r.brand)]);
  const dirty = JSON.stringify(rows.map((r) => [r.brand, r.counts])) !== JSON.stringify(initialBrands.map((r) => [r.brand, r.counts]));

  function setCount(brand: string, key: string, value: number) {
    setRows((rs) => rs.map((r) => (r.brand === brand ? { ...r, counts: { ...r.counts, [key]: Math.max(0, Math.round(value || 0)) } } : r)));
  }

  function addBrand(name = newBrand.trim()) {
    if (!name) return;
    if (rows.some((r) => r.brand.toLowerCase() === name.toLowerCase())) return setError(`${name} is already listed.`);
    setError(null);
    setRows((rs) => [...rs, { brand: name, counts: emptyCounts(rules) }]);
    setNewBrand("");
  }

  async function save() {
    setError(null);
    if (!initialShopName && !shopName.trim()) return setError("Give the shop a name before saving.");
    setSaving(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brands: rows.map(({ brand, counts }) => ({ brand, counts })), reviewNotes: notes, shopName }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? `Could not save (${res.status})`);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const quickAdd = ["Zain", "stc", "Batelco", ...knownBrands]
    .filter((b, i, all) => all.findIndex((x) => x.toLowerCase() === b.toLowerCase()) === i)
    .filter((b) => !rows.some((r) => r.brand.toLowerCase() === b.toLowerCase()));

  const title = status === "REVIEWED" ? "Confirmed scores" : status === "FLAGGED" || initialBrands.length === 0 ? "Score this photo" : "Confirm or correct";

  return (
    <Card className={status === "SCORED" || status === "FLAGGED" ? "ring-2 ring-brand-200" : ""}>
      <CardHeader
        title={title}
        subtitle={editing ? "Use the photo to set each operator's counts. Scores update as you go." : "Admins only. Rankings use these scores."}
        action={
          !editing && (
            <button type="button" onClick={() => setEditing(true)} className={btn.ghost}>
              <Icon name="edit" className="h-4 w-4" /> Edit counts
            </button>
          )
        }
      />

      <div className="space-y-4 p-4 sm:p-5">
        {(editing || !initialShopName) && (
          <div>
            <label className={label} htmlFor="review-shop">Shop name</label>
            <input id="review-shop" className={input} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Name on the shop's sign" />
          </div>
        )}

        {editing &&
          rows.map((row) => {
            const score = computeScore(row.counts, rules).totalScore;
            return (
              <div key={row.brand} className="overflow-hidden rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between gap-2 bg-canvas px-3.5 py-2.5">
                  <span className="flex items-center gap-2 font-extrabold text-brand-950">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[row.brand] ?? "#8a93b3" }} />
                    {row.brand}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm tabular-nums">
                      <b>{score}</b> <span className="text-neutral-400">/ {maxScore}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setRows((rs) => rs.filter((r) => r.brand !== row.brand))}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${row.brand}`}
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  </span>
                </div>
                <div className="grid gap-x-6 gap-y-3 p-3.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {rules.map((rule) => {
                    const ai = row.aiCounts?.[rule.key];
                    const value = row.counts[rule.key] ?? 0;
                    return (
                      <div key={rule.key} className="flex items-center justify-between gap-3">
                        <span className="min-w-0 text-sm">
                          <span className="font-bold text-brand-950">{rule.label}</span>
                          <span className="block text-[11px] text-neutral-400">
                            {rule.pointsPerUnit} pts each · max {rule.maxUnits}
                            {ai !== undefined && ai !== value && <span className="text-amber-700"> · AI said {ai}</span>}
                          </span>
                        </span>
                        <Stepper
                          name={`${row.brand} ${rule.label}`}
                          value={value}
                          max={rule.maxUnits}
                          changed={ai !== undefined && ai !== value}
                          onChange={(n) => setCount(row.brand, rule.key, n)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {editing && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-3.5">
            <div className="text-sm font-bold text-brand-950">Add an operator the AI missed</div>
            {quickAdd.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickAdd.slice(0, 6).map((b) => (
                  <button key={b} type="button" onClick={() => addBrand(b)} className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-bold text-brand-800 hover:border-brand-500 hover:bg-brand-50">
                    + {b}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <input
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBrand();
                  }
                }}
                placeholder="Other operator name"
                className={input}
              />
              <button type="button" onClick={() => addBrand()} className={btn.secondary}>
                Add
              </button>
            </div>
          </div>
        )}

        {(editing || status === "SCORED") && (
          <textarea
            placeholder="Note for the record (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={input}
            rows={2}
          />
        )}

        {error && <Notice tone="error">{error}</Notice>}

        {editing ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {initialBrands.length > 0 && status !== "FLAGGED" && (
              <button
                type="button"
                className={btn.secondary}
                onClick={() => {
                  setRows(initialBrands);
                  setShopName(initialShopName);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            )}
            <button type="button" onClick={save} disabled={saving} className={btn.primary}>
              {saving ? <Spinner /> : <Icon name="check-circle" className="h-4 w-4" />}
              {dirty ? "Save corrected scores" : "Save scores"}
            </button>
          </div>
        ) : status === "SCORED" ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={save} disabled={saving} className={`${btn.primary} flex-1`}>
              {saving ? <Spinner /> : <Icon name="check-circle" className="h-4 w-4" />} Counts are correct, confirm
            </button>
            <button type="button" onClick={() => setEditing(true)} className={`${btn.secondary} flex-1`}>
              <Icon name="edit" className="h-4 w-4" /> Correct counts
            </button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

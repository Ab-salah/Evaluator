"use client";

import { useMemo, useState } from "react";
import { maxScoreFor, type MatrixElementRule } from "@/lib/scoring";

type Draft = MatrixElementRule & { saving?: boolean; error?: string; dirty?: boolean };

export function MatrixEditor({ initialRules }: { initialRules: MatrixElementRule[] }) {
  const [rules, setRules] = useState<Draft[]>(initialRules);
  const [newElement, setNewElement] = useState({
    key: "",
    label: "",
    description: "",
    pointsPerUnit: "",
    maxUnits: "",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const maxScore = useMemo(() => maxScoreFor(rules), [rules]);

  function updateField<K extends keyof Draft>(id: string, field: K, value: Draft[K]) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value, dirty: true } : r)));
  }

  async function saveRow(id: string) {
    const row = rules.find((r) => r.id === id);
    if (!row) return;
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, saving: true, error: undefined } : r)));
    try {
      const res = await fetch(`/api/matrix/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: row.label,
          description: row.description,
          pointsPerUnit: row.pointsPerUnit,
          maxUnits: row.maxUnits,
        }),
      });
      const data = await res.json();
      if (res.status >= 400) throw new Error(data.error ?? "Could not save");
      setRules((rs) =>
        rs.map((r) => (r.id === id ? { ...r, saving: false, dirty: false, error: undefined } : r)),
      );
    } catch (err) {
      setRules((rs) =>
        rs.map((r) => (r.id === id ? { ...r, saving: false, error: (err as Error).message } : r)),
      );
    }
  }

  async function deleteRow(id: string) {
    if (!confirm("Remove this element from the matrix? New submissions will no longer be scored on it.")) {
      return;
    }
    const res = await fetch(`/api/matrix/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRules((rs) => rs.filter((r) => r.id !== id));
    }
  }

  async function addElement(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newElement.key.trim(),
          label: newElement.label.trim(),
          description: newElement.description.trim(),
          pointsPerUnit: Number(newElement.pointsPerUnit),
          maxUnits: Number(newElement.maxUnits),
        }),
      });
      const data = await res.json();
      if (res.status >= 400) throw new Error(data.error ?? "Could not add element");
      setRules((rs) => [...rs, data.element]);
      setNewElement({ key: "", label: "", description: "", pointsPerUnit: "", maxUnits: "" });
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-baseline justify-between border-b border-neutral-200 px-4 py-3">
          <span className="text-sm font-medium text-neutral-500">Max achievable score</span>
          <span className="text-lg font-semibold">{maxScore}</span>
        </div>

        <ul className="divide-y divide-neutral-100">
          {rules.map((rule) => (
            <li key={rule.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  value={rule.label}
                  onChange={(e) => updateField(rule.id, "label", e.target.value)}
                  className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-medium"
                />
                <code className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                  {rule.key}
                </code>
              </div>
              <textarea
                value={rule.description}
                onChange={(e) => updateField(rule.id, "description", e.target.value)}
                rows={2}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-neutral-600"
                placeholder="Description used to brief the AI detector"
              />
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-1.5">
                  Points / unit
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={rule.pointsPerUnit}
                    onChange={(e) => updateField(rule.id, "pointsPerUnit", Number(e.target.value))}
                    className="w-20 rounded-md border border-neutral-300 px-2 py-1"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  Max units
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={rule.maxUnits}
                    onChange={(e) => updateField(rule.id, "maxUnits", Number(e.target.value))}
                    className="w-16 rounded-md border border-neutral-300 px-2 py-1"
                  />
                </label>
                <span className="text-neutral-400">
                  = {Math.round(rule.pointsPerUnit * rule.maxUnits * 100) / 100} pts capped
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveRow(rule.id)}
                    disabled={!rule.dirty || rule.saving}
                    className="rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-40"
                  >
                    {rule.saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRow(rule.id)}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {rule.error && <p className="text-xs text-red-600">{rule.error}</p>}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={addElement} className="space-y-3 rounded-lg border border-dashed border-neutral-300 p-4">
        <h2 className="text-sm font-medium">Add a new element</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="key (e.g. window_decal)"
            value={newElement.key}
            onChange={(e) => setNewElement((n) => ({ ...n, key: e.target.value }))}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Label (e.g. Window decal)"
            value={newElement.label}
            onChange={(e) => setNewElement((n) => ({ ...n, label: e.target.value }))}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <textarea
          placeholder="Description — what the AI should look for"
          value={newElement.description}
          onChange={(e) => setNewElement((n) => ({ ...n, description: e.target.value }))}
          rows={2}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <div className="flex items-center gap-3">
          <input
            type="number"
            step="0.25"
            min="0"
            placeholder="Points / unit"
            value={newElement.pointsPerUnit}
            onChange={(e) => setNewElement((n) => ({ ...n, pointsPerUnit: e.target.value }))}
            className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            step="1"
            min="1"
            placeholder="Max units"
            value={newElement.maxUnits}
            onChange={(e) => setNewElement((n) => ({ ...n, maxUnits: e.target.value }))}
            className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={adding}
            className="ml-auto rounded-md bg-brand-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add element"}
          </button>
        </div>
        {addError && <p className="text-xs text-red-600">{addError}</p>}
      </form>
    </div>
  );
}

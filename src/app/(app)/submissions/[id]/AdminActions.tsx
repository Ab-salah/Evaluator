"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn, Icon, Spinner } from "@/components/ui";
import { readJson } from "@/lib/read-json";

export function AdminActions({ id, aiOn, canRescore }: { id: string; aiOn: boolean; canRescore: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"rescore" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(kind: "rescore" | "delete") {
    if (kind === "delete" && !confirm("Delete this audit and its photo? This cannot be undone.")) return;
    if (kind === "rescore" && !confirm("Re-run AI scoring? The current counts, including any corrections, will be replaced.")) return;
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(kind === "delete" ? `/api/submissions/${id}` : `/api/submissions/${id}/rescore`, {
        method: kind === "delete" ? "DELETE" : "POST",
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      if (kind === "delete") router.push("/audits");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        {aiOn && canRescore && (
          <button type="button" onClick={() => call("rescore")} disabled={!!busy} className={btn.secondary}>
            {busy === "rescore" ? <Spinner /> : <Icon name="refresh" className="h-4 w-4" />} Re-run AI
          </button>
        )}
        <button type="button" onClick={() => call("delete")} disabled={!!busy} className={btn.danger} title="Delete audit">
          {busy === "delete" ? <Spinner /> : <Icon name="trash" className="h-4 w-4" />}
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
      {error && <p className="text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}

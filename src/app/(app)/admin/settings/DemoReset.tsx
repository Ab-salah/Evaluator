"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { btn, Icon, Notice, Spinner } from "@/components/ui";
import type { FormState } from "@/app/actions/auth";
import { resetDemo } from "./actions";

export function DemoReset() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [result, setResult] = useState<FormState>(undefined);

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        className={btn.danger}
        onClick={() => {
          if (
            !confirm(
              "Reset the demo? Every audit, shop and photo is replaced by the original sample data, the matrix goes back to its defaults, accounts you added are removed and the demo accounts get their original passwords.",
            )
          )
            return;
          setResult(undefined);
          start(async () => {
            setResult(await resetDemo());
            router.refresh();
          });
        }}
      >
        {busy ? <Spinner /> : <Icon name="refresh" className="h-4 w-4" />}
        {busy ? "Resetting…" : "Reset demo data"}
      </button>
      {result?.ok && <Notice tone="success">{result.ok}</Notice>}
      {result?.error && <Notice tone="error">{result.error}</Notice>}
    </div>
  );
}

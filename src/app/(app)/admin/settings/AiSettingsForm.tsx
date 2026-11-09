"use client";

import { useActionState, useState, useTransition } from "react";
import { btn, Icon, input, label, Notice, Spinner } from "@/components/ui";
import type { FormState } from "@/app/actions/auth";
import { removeApiKey, saveAiSettings, testAiSettings } from "./actions";

type Model = { id: string; label: string; note: string };

export function AiSettingsForm({
  keySource,
  keyHint,
  model,
  models,
}: {
  keySource: "app" | "env" | null;
  keyHint: string | null;
  model: string;
  models: Model[];
}) {
  const [state, save, saving] = useActionState(saveAiSettings, undefined);
  const [other, setOther] = useState<FormState>(undefined);
  const [busy, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const result = other ?? state;

  const run = (fn: () => Promise<FormState>) =>
    startTransition(async () => {
      setOther(await fn());
    });

  return (
    <form
      action={(fd) => {
        setOther(undefined);
        save(fd);
      }}
      className="space-y-5 p-4 sm:p-5"
    >
      <div>
        <label htmlFor="apiKey" className={label}>
          Anthropic API key
        </label>
        {keySource && (
          <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <Icon name="key" className="h-4 w-4 text-zain-teal" />
            Current key ends in <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-bold">…{keyHint}</code>
            <span className="text-xs text-neutral-500">
              {keySource === "app" ? "(saved here)" : "(from the server's ANTHROPIC_API_KEY)"}
            </span>
          </p>
        )}
        <div className="relative">
          <input
            id="apiKey"
            name="apiKey"
            type={show ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder={keySource ? "Paste a new key to replace it" : "sk-ant-..."}
            className={`${input} pr-16 font-mono`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-brand-700 hover:bg-brand-50"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        {keySource === "env" && (
          <p className="mt-1.5 text-xs text-neutral-500">A key saved here takes priority over the server&apos;s one.</p>
        )}
      </div>

      <fieldset>
        <legend className={label}>Model</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {models.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer gap-3 rounded-xl border border-neutral-200 p-3 transition has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
            >
              <input type="radio" name="model" value={m.id} defaultChecked={m.id === model} className="mt-1 accent-brand-700" />
              <span>
                <span className="block text-sm font-bold text-brand-950">{m.label}</span>
                <span className="block text-xs text-neutral-500">{m.note}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {result?.error && <Notice tone="error">{result.error}</Notice>}
      {result?.ok && <Notice tone="success">{result.ok}</Notice>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={saving || busy} className={btn.primary}>
          {saving ? <Spinner /> : <Icon name="check-circle" className="h-4 w-4" />}
          {saving ? "Saving and testing…" : "Save"}
        </button>
        {keySource && (
          <button type="button" disabled={saving || busy} onClick={() => run(testAiSettings)} className={btn.secondary}>
            {busy ? <Spinner /> : <Icon name="refresh" className="h-4 w-4" />} Test connection
          </button>
        )}
        {keySource === "app" && (
          <button
            type="button"
            disabled={saving || busy}
            onClick={() => {
              if (confirm("Remove the saved API key? AI scoring stops unless the server has its own key.")) run(removeApiKey);
            }}
            className={`${btn.danger} sm:ml-auto`}
          >
            <Icon name="trash" className="h-4 w-4" /> Remove key
          </button>
        )}
      </div>
    </form>
  );
}

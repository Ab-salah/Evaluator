"use client";

import { useActionState } from "react";
import { demoLogin } from "@/app/actions/auth";
import { Icon, Notice, Spinner } from "@/components/ui";

type Account = { email: string; name: string; title: string; role: "ADMIN" | "USER" };

/** Demo mode: sign in as a sample admin or field rep with one click. */
export function DemoSignIn({ accounts, password, next }: { accounts: Account[]; password: string; next?: string }) {
  const [state, action, pending] = useActionState(demoLogin, undefined);

  return (
    <form action={action} className="mt-6 rounded-2xl border border-zain-lime/70 bg-[#f8fbe3] p-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="flex items-center gap-2 text-sm font-extrabold text-brand-950">
        <Icon name="sparkles" className="h-4 w-4 text-[#7f8f12]" /> Demo: sign in with one click
      </div>
      <p className="mt-1 text-xs text-neutral-600">Sample shops and simulated AI results, no API key needed. Try both roles.</p>
      <div className="mt-3 grid gap-2">
        {accounts.map((a) => (
          <button
            key={a.email}
            type="submit"
            name="email"
            value={a.email}
            disabled={pending}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50 active:scale-[0.99] disabled:opacity-60"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white ${
                a.role === "ADMIN" ? "bg-brand-700" : "bg-zain-teal"
              }`}
            >
              {a.name
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-brand-950">{a.name}</span>
              <span className="block truncate text-xs text-neutral-500">{a.title}</span>
            </span>
            {pending ? <Spinner className="h-4 w-4 text-brand-700" /> : <Icon name="chevron-right" className="h-4 w-4 text-brand-700" />}
          </button>
        ))}
      </div>
      {state?.error && (
        <div className="mt-3">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}
      <p className="mt-3 text-[11px] text-neutral-500">
        Or use the form below: {accounts.map((a) => a.email).join(", ")}, password <b>{password}</b>.
      </p>
    </form>
  );
}

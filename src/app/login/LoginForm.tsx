"use client";

import { useActionState, useState } from "react";
import { login } from "@/app/actions/auth";
import { btn, Icon, input, label, Notice, Spinner } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className={label}>
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus className={input} placeholder="name@bh.zain.com" />
      </div>
      <div>
        <label htmlFor="password" className={label}>
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${input} pr-16`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2 text-xs font-bold text-brand-700 hover:bg-brand-50"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <button type="submit" disabled={pending} className={`${btn.primary} w-full py-3 text-[15px]`}>
        {pending ? <Spinner /> : <Icon name="chevron-right" className="h-4 w-4" />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

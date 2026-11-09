"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { btn, input, label, Notice, Spinner } from "@/components/ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} key={state?.ok ? "done" : "form"} className="space-y-4 p-4 sm:p-5">
      <div>
        <label className={label} htmlFor="current">Current password</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className={input} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="next">New password</label>
          <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required className={input} />
        </div>
        <div>
          <label className={label} htmlFor="confirm">Repeat new password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className={input} />
        </div>
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.ok}</Notice>}
      <button disabled={pending} className={btn.primary}>
        {pending && <Spinner />} Update password
      </button>
    </form>
  );
}

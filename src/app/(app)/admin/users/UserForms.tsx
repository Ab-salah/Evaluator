"use client";

import { useActionState, useState } from "react";
import { createUser, updateUser } from "./actions";
import { btn, Icon, input, label, Notice, Spinner } from "@/components/ui";

type U = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  active: boolean;
  hasPassword: boolean;
  audits: number;
  lastLogin: string | null;
};

function RolePicker({ defaultValue = "USER" }: { defaultValue?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { v: "USER", t: "Field user", d: "Submits audits" },
        { v: "ADMIN", t: "Admin", d: "Reviews & manages" },
      ].map((o) => (
        <label key={o.v} className="cursor-pointer rounded-xl border border-neutral-200 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
          <input type="radio" name="role" value={o.v} defaultChecked={defaultValue === o.v} className="sr-only" />
          <span className="block text-sm font-extrabold text-brand-950">{o.t}</span>
          <span className="block text-xs text-neutral-500">{o.d}</span>
        </label>
      ))}
    </div>
  );
}

function suggestPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function NewUserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
  const [pw, setPw] = useState("");
  return (
    <form action={action} key={state?.ok} className="space-y-4 p-4 sm:p-5">
      <div>
        <label className={label} htmlFor="nu-name">Full name</label>
        <input id="nu-name" name="name" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="nu-email">Email</label>
        <input id="nu-email" name="email" type="email" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="nu-pw">Temporary password</label>
        <div className="flex gap-2">
          <input id="nu-pw" name="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required className={`${input} font-mono`} />
          <button type="button" onClick={() => setPw(suggestPassword())} className={btn.secondary} title="Generate a password">
            <Icon name="sparkles" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <RolePicker />
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.ok}</Notice>}
      <button disabled={pending} className={`${btn.primary} w-full`}>
        {pending ? <Spinner /> : <Icon name="plus" className="h-4 w-4" />} Create account
      </button>
    </form>
  );
}

export function UserRow({ user, isMe }: { user: U; isMe: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateUser, undefined);
  return (
    <li className={user.active ? "" : "bg-neutral-50"}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-brand-50/60 sm:px-5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white ${
            !user.active ? "bg-neutral-300" : user.role === "ADMIN" ? "bg-zain-purple" : "bg-zain-teal"
          }`}
        >
          {user.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={`truncate font-extrabold ${user.active ? "text-brand-950" : "text-neutral-400"}`}>{user.name}</span>
            {isMe && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">You</span>}
            {user.role === "ADMIN" && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-800">Admin</span>}
            {!user.active && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-bold text-neutral-600">Deactivated</span>}
            {!user.hasPassword && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">No password</span>}
          </span>
          <span className="block truncate text-xs text-neutral-500">
            {user.email} · {user.audits} audit{user.audits === 1 ? "" : "s"} · {user.lastLogin ? `last in ${user.lastLogin}` : "never signed in"}
          </span>
        </span>
        <Icon name="chevron-right" className={`h-5 w-5 shrink-0 text-neutral-300 transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <form action={action} className="animate-rise space-y-4 border-t border-neutral-100 bg-canvas/60 px-4 py-4 sm:px-5">
          <input type="hidden" name="id" value={user.id} />
          <RolePicker defaultValue={user.role} />
          <div>
            <label className={label} htmlFor={`pw-${user.id}`}>{user.hasPassword ? "Reset password" : "Set a password"}</label>
            <input id={`pw-${user.id}`} name="password" placeholder="Leave blank to keep the current one" minLength={8} className={`${input} font-mono`} />
          </div>
          <label className="flex items-center gap-2.5 text-sm font-bold text-brand-950">
            <input type="checkbox" name="active" defaultChecked={user.active} className="h-4 w-4 accent-brand-700" />
            Account is active (can sign in)
          </label>
          {state?.error && <Notice tone="error">{state.error}</Notice>}
          {state?.ok && <Notice tone="success">{state.ok}</Notice>}
          <button disabled={pending} className={btn.primary}>
            {pending && <Spinner />} Save changes
          </button>
        </form>
      )}
    </li>
  );
}

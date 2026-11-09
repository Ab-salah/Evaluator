"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, ensureBootstrapAdmin, getCurrentUser } from "@/lib/auth";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";

export type FormState = { error?: string; ok?: string } | undefined;

// Only same-site paths, so ?next= can't bounce users to another site.
function safeNext(next: FormDataEntryValue | null): string {
  const n = String(next ?? "");
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") ? n : "/";
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  await ensureBootstrapAdmin();
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password, so accounts can't be probed.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "That email and password don't match an account." };
  }
  if (!user.active) return { error: "This account has been deactivated. Ask an admin to re-enable it." };

  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "Your current password is not correct." };
  }
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: "The new passwords don't match." };

  await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Password updated." };
}

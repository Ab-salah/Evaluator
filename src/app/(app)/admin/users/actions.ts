"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, passwordProblem } from "@/lib/password";
import type { FormState } from "@/app/actions/auth";

async function admin() {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") throw new Error("Only admins can manage users.");
  return me;
}

const asRole = (v: FormDataEntryValue | null): Role => (v === "ADMIN" ? "ADMIN" : "USER");

export async function createUser(_prev: FormState, form: FormData): Promise<FormState> {
  await admin();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name) return { error: "Enter the person's name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const existing = await prisma.user.findUnique({ where: { email } });
  // Accounts created by the old, login-less version have no password yet:
  // claim them, so their past audits stay linked.
  if (existing?.passwordHash) return { error: `${email} already has an account.` };
  const data = { name, role: asRole(form.get("role")), passwordHash: await hashPassword(password), active: true };
  if (existing) await prisma.user.update({ where: { id: existing.id }, data });
  else await prisma.user.create({ data: { ...data, email } });

  revalidatePath("/admin/users");
  return { ok: `Account created for ${name}. Share the email and temporary password with them.` };
}

export async function updateUser(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await admin();
  const id = String(form.get("id") ?? "");
  const role = asRole(form.get("role"));
  const active = form.get("active") === "on";
  const password = String(form.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };
  if (id === me.id && (role !== "ADMIN" || !active)) return { error: "You can't remove your own admin access or deactivate yourself." };
  if (user.role === "ADMIN" && (role !== "ADMIN" || !active)) {
    const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true, id: { not: id } } });
    if (otherAdmins === 0) return { error: "There must always be at least one active admin." };
  }
  if (password) {
    const problem = passwordProblem(password);
    if (problem) return { error: problem };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { role, active, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    }),
    // A reset password or deactivation signs the person out everywhere.
    ...(password || !active ? [prisma.session.deleteMany({ where: { userId: id } })] : []),
  ]);
  revalidatePath("/admin/users");
  return { ok: password ? "Saved, and the password was reset." : "Saved." };
}

import { createHash, randomBytes } from "crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { hashPassword } from "./password";

export const SESSION_COOKIE = "ve_session";
const SESSION_DAYS = 14;

export type CurrentUser = { id: string; email: string; name: string; role: Role };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Secure cookies only work over HTTPS. Self-hosted installs often start on
 * plain http on an internal network, so detect it rather than breaking
 * sign-in there; COOKIE_SECURE=true/false overrides the detection.
 */
async function cookieShouldBeSecure(): Promise<boolean> {
  const override = process.env.COOKIE_SECURE;
  if (override === "true") return true;
  if (override === "false") return false;
  const h = await headers();
  return h.get("x-forwarded-proto") === "https" || (process.env.APP_URL ?? "").startsWith("https://");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await cookieShouldBeSecure(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  const { id, email, name, role } = session.user;
  return { id, email, name, role };
});

/** For pages: redirects to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: redirects non-admins to the home page. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** For API routes: returns the user or an error response to send back. */
export async function apiUser(
  role?: Role,
): Promise<{ user: CurrentUser; error?: never } | { user?: never; error: Response }> {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Please sign in again." }, { status: 401 }) };
  if (role === "ADMIN" && user.role !== "ADMIN") {
    return { error: Response.json({ error: "Only admins can do this." }, { status: 403 }) };
  }
  return { user };
}

/**
 * First-run setup: when no admin exists yet, creates one from ADMIN_EMAIL /
 * ADMIN_PASSWORD. Called on the sign-in path, so a fresh install needs no
 * separate seed step.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const admins = await prisma.user.count({ where: { role: "ADMIN", passwordHash: { not: null } } });
  if (admins > 0) return;
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", active: true, passwordHash: await hashPassword(password) },
    create: {
      email,
      name: process.env.ADMIN_NAME?.trim() || "Administrator",
      role: "ADMIN",
      passwordHash: await hashPassword(password),
    },
  });
}

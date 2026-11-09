"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppMark, Icon, type IconName } from "./ui";
import { logout } from "@/app/actions/auth";

type NavItem = { href: string; label: string; icon: IconName; badge?: number; mobile?: boolean };

const logo = process.env.NEXT_PUBLIC_LOGO_PATH || null;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-9 w-auto" />
      ) : (
        <AppMark />
      )}
      <span className="min-w-0 leading-tight text-white">
        <span className="block truncate text-[15px] font-extrabold tracking-tight">Visibility Evaluator</span>
        {!compact && <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-zain-sky">Reseller audits</span>}
      </span>
    </Link>
  );
}

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-zain-magenta px-1.5 py-0.5 text-center text-[11px] font-extrabold leading-none text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

// Admin pages aren't in the phone tab bar, so the account menu lists them.
const ADMIN_LINKS: NavItem[] = [
  { href: "/admin/matrix", label: "Visibility matrix", icon: "grid" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-zain-teal text-sm font-extrabold text-white ring-2 ring-white/30"
      >
        {initials || <Icon name="user" className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 animate-rise overflow-hidden rounded-2xl border border-neutral-200 bg-white text-sm shadow-xl">
          <div className="border-b border-neutral-100 px-4 py-3">
            <div className="truncate font-bold text-brand-950">{name}</div>
            <div className="truncate text-xs text-neutral-500">{email}</div>
            <span className="mt-1.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
              {role === "ADMIN" ? "Admin" : "Field user"}
            </span>
          </div>
          <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 font-bold text-brand-900 hover:bg-brand-50">
            <Icon name="key" className="h-4 w-4" /> Account & password
          </Link>
          {role === "ADMIN" && (
            <div className="border-t border-neutral-100 lg:hidden">
              {ADMIN_LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 font-bold text-brand-900 hover:bg-brand-50">
                  <Icon name={l.icon} className="h-4 w-4" /> {l.label}
                </Link>
              ))}
            </div>
          )}
          <form action={logout}>
            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-bold text-red-700 hover:bg-red-50">
              <Icon name="logout" className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function AppShell({
  user,
  reviewCount,
  children,
}: {
  user: { name: string; email: string; role: "USER" | "ADMIN" };
  reviewCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";

  const main: NavItem[] = [
    { href: "/", label: "Dashboard", icon: "home", mobile: true },
    { href: "/submit", label: "New audit", icon: "camera", mobile: true },
    { href: "/audits", label: isAdmin ? "All audits" : "My audits", icon: "list", mobile: true },
    ...(isAdmin ? [{ href: "/review", label: "Review queue", icon: "inbox" as const, badge: reviewCount, mobile: true }] : []),
  ];
  const admin: NavItem[] = isAdmin ? ADMIN_LINKS : [];

  const link = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
          active ? "bg-white text-brand-900 shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon name={item.icon} className="h-5 w-5 shrink-0" />
        {item.label}
        <Badge n={item.badge} />
      </Link>
    );
  };

  // Phones get a bottom tab bar; matrix/users live on the dashboard for admins there.
  const tabs = main.filter((i) => i.mobile);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden bg-midnight lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-28 h-96 w-96 bg-zain-pattern opacity-[0.13] mix-blend-screen"
        />
        <div className="relative px-5 pb-6 pt-6">
          <Brand />
        </div>
        <nav className="relative flex-1 space-y-1 px-3">
          {main.map(link)}
          {admin.length > 0 && (
            <>
              <div className="px-3 pb-1 pt-5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/40">Admin</div>
              {admin.map(link)}
            </>
          )}
        </nav>
        <div className="relative m-3 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
          <UserMenuInline user={user} />
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-30 bg-midnight pt-[env(safe-area-inset-top)] lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Brand compact />
          <UserMenu {...user} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 pb-safe backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
          {tabs.map((item) => {
            const active = isActive(pathname, item.href);
            const primary = item.href === "/submit";
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold ${
                    active ? "text-brand-700" : "text-neutral-500"
                  }`}
                >
                  {primary ? (
                    <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-lg shadow-brand-900/30 ring-4 ring-white">
                      <Icon name="camera" className="h-6 w-6" />
                    </span>
                  ) : (
                    <Icon name={item.icon} className="h-6 w-6" />
                  )}
                  <span>{primary ? "Audit" : item.label.replace("All audits", "Audits").replace("Review queue", "Review")}</span>
                  {item.badge ? (
                    <span className="absolute right-[22%] top-0 min-w-4 rounded-full bg-zain-magenta px-1 text-center text-[10px] font-extrabold leading-4 text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function UserMenuInline({ user }: { user: { name: string; email: string; role: string } }) {
  return (
    <>
      <div className="min-w-0 flex-1 text-white">
        <div className="truncate text-sm font-bold">{user.name}</div>
        <div className="truncate text-[11px] text-white/60">{user.role === "ADMIN" ? "Admin" : "Field user"}</div>
      </div>
      <Link href="/account" title="Account & password" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white">
        <Icon name="key" className="h-4 w-4" />
      </Link>
      <form action={logout}>
        <button title="Sign out" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white">
          <Icon name="logout" className="h-4 w-4" />
        </button>
      </form>
    </>
  );
}

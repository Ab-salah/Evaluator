"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-gold-500 text-brand-950" : "text-brand-100 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

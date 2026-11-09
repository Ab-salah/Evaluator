import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { NavLink } from "@/components/NavLink";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visibility Evaluator",
  description: "AI-scored reseller shop visibility audits",
};

// Set at build time from public/logo.svg or public/logo.png (see
// next.config.ts). Falls back to a plain mark otherwise. Deliberately not any
// one operator's logo by default: this app scores Zain, stc, Batelco and
// others side by side, so branding the whole product as one of them would
// misrepresent it to everyone else's stakeholders.
const logo = process.env.NEXT_PUBLIC_LOGO_PATH || null;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              {logo ? (
                <Image
                  src={logo}
                  alt=""
                  width={28}
                  height={28}
                  // The optimizer refuses SVGs by default; serve them as-is.
                  unoptimized={logo.endsWith(".svg")}
                  className="h-7 w-auto"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-700 text-sm text-white">
                  V
                </span>
              )}
              <span className="hidden sm:inline">Visibility Evaluator</span>
            </Link>
            <nav className="flex gap-1 overflow-x-auto text-sm">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/submit">New audit</NavLink>
              <NavLink href="/admin/matrix">Matrix</NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

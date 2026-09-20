import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visibility Evaluator",
  description: "AI-scored reseller shop visibility audits",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Visibility Evaluator
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-neutral-600">
              <Link href="/" className="hover:text-neutral-900">
                Rankings
              </Link>
              <Link href="/submit" className="hover:text-neutral-900">
                New submission
              </Link>
              <Link href="/admin/matrix" className="hover:text-neutral-900">
                Matrix
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

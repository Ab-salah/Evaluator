import Link from "next/link";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}

import Link from "next/link";
import { btn, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <EmptyState icon="search" title="Page not found" action={<Link href="/" className={btn.primary}>Back to dashboard</Link>}>
          The page or audit you were looking for doesn&apos;t exist, or you don&apos;t have access to it.
        </EmptyState>
      </div>
    </div>
  );
}

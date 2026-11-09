import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { reviewQueueCount } from "@/lib/review";

export const dynamic = "force-dynamic";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const reviewCount = user.role === "ADMIN" ? await reviewQueueCount() : 0;
  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} reviewCount={reviewCount}>
      {children}
    </AppShell>
  );
}

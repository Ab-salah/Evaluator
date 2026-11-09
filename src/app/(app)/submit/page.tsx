import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai-vision";
import { UNNAMED_SHOP } from "@/lib/scoring-job";
import { PageHeader } from "@/components/ui";
import { SubmitForm } from "./SubmitForm";

export const metadata: Metadata = { title: "New audit" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const user = await requireUser();
  const shops = await prisma.shop.findMany({
    where: { name: { not: UNNAMED_SHOP } },
    select: { name: true },
    distinct: ["name"],
    orderBy: { name: "asc" },
    take: 500,
  });
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="New audit"
        subtitle="Photograph the shop front. Every operator's branding is found and scored against the Visibility Matrix."
      />
      <SubmitForm aiOn={await aiEnabled()} isAdmin={user.role === "ADMIN"} knownShops={shops.map((s) => s.name)} />
    </div>
  );
}

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai-vision";
import { UNNAMED_SHOP } from "@/lib/scoring-job";
import { PageHeader } from "@/components/ui";
import { SubmitForm } from "./SubmitForm";
import { DEMO_MODE } from "@/lib/demo/mode";
import { DEMO_SAMPLES, samplePhoto } from "@/lib/demo/catalog";

export const metadata: Metadata = { title: "New audit" };
export const dynamic = "force-dynamic";

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const user = await requireUser();
  const { shop: shopId } = await searchParams;
  const shop = shopId
    ? await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true, code: true, city: true, region: true } })
    : null;
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
      <SubmitForm
        aiOn={await aiEnabled()}
        isAdmin={user.role === "ADMIN"}
        knownShops={shops.map((s) => s.name)}
        shop={shop && shop.name !== UNNAMED_SHOP ? shop : null}
        samples={DEMO_MODE ? DEMO_SAMPLES.map((s) => ({ slug: s.slug, name: s.name, src: `/demo/${samplePhoto(s)}` })) : []}
      />
    </div>
  );
}

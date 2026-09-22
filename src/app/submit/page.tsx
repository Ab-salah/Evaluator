import { prisma } from "@/lib/db";
import { SubmitForm } from "./SubmitForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const rows = await prisma.submission.findMany({
    distinct: ["brand"],
    select: { brand: true },
    orderBy: { brand: "asc" },
  });

  return <SubmitForm knownBrands={rows.map((r) => r.brand)} />;
}

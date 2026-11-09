import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getMatrixRules } from "@/lib/matrix";
import { PageHeader } from "@/components/ui";
import { MatrixEditor } from "./MatrixEditor";

export const metadata: Metadata = { title: "Visibility matrix" };
export const dynamic = "force-dynamic";

export default async function MatrixAdminPage() {
  await requireAdmin();
  const rules = await getMatrixRules();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Visibility matrix"
        subtitle="The elements, points per unit and caps every photo is scored on. Descriptions brief the AI on what to count. Changes apply to photos scored from now on; already-scored audits keep their score until re-scored or reviewed."
      />
      <MatrixEditor initialRules={rules} />
    </div>
  );
}

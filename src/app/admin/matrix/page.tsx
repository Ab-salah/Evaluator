import { getMatrixRules } from "@/lib/matrix";
import { BackLink } from "@/components/BackLink";
import { MatrixEditor } from "./MatrixEditor";

export const dynamic = "force-dynamic";

export default async function MatrixAdminPage() {
  const rules = await getMatrixRules();

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/">Back to dashboard</BackLink>
      <h1 className="mb-1 text-xl font-semibold">Visibility Matrix</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Edit the elements, points-per-unit and caps used to score every new submission. Changes
        apply immediately to submissions scored from now on; already-scored submissions keep the
        score they were given at the time.
      </p>
      <MatrixEditor initialRules={rules} />
    </div>
  );
}

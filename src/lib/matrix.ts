import { prisma } from "./db";
import type { MatrixElementRule } from "./scoring";

// Used only to seed a brand-new database on first run. After that, the
// matrix lives entirely in the MatrixElement table and this constant is
// never read again — edit it in /admin/matrix instead.
const DEFAULT_MATRIX: Omit<MatrixElementRule, "sortOrder" | "id">[] = [
  {
    key: "signage",
    label: "Signage",
    description: "Branded storefront signage (fascia/shop sign carrying the brand).",
    pointsPerUnit: 10,
    maxUnits: 1,
  },
  {
    key: "full_stickers",
    label: "Full stickers",
    description: "Full-coverage branded stickers applied to the storefront.",
    pointsPerUnit: 7,
    maxUnits: 2,
  },
  {
    key: "generic_posters",
    label: "Generic posters",
    description: "Generic branded posters displayed in or around the shop.",
    pointsPerUnit: 2.5,
    maxUnits: 3,
  },
  {
    key: "stripes",
    label: "Stripes",
    description: "Branded stripes/edging applied to the storefront.",
    pointsPerUnit: 1,
    maxUnits: 3,
  },
  {
    key: "approved_reseller",
    label: "Approved reseller",
    description: '"Approved reseller" marker/plaque displayed at the shop.',
    pointsPerUnit: 0.5,
    maxUnits: 1,
  },
  {
    key: "push_pull",
    label: "Push/Pull",
    description: "Branded push/pull door handle stickers.",
    pointsPerUnit: 0.25,
    maxUnits: 1,
  },
];

async function seedDefaultMatrixIfEmpty() {
  const count = await prisma.matrixElement.count();
  if (count > 0) return;
  await prisma.matrixElement.createMany({
    data: DEFAULT_MATRIX.map((el, i) => ({ ...el, sortOrder: i })),
  });
}

export async function getMatrixRules(): Promise<MatrixElementRule[]> {
  await seedDefaultMatrixIfEmpty();
  const rows = await prisma.matrixElement.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    description: r.description,
    pointsPerUnit: r.pointsPerUnit,
    maxUnits: r.maxUnits,
    sortOrder: r.sortOrder,
  }));
}

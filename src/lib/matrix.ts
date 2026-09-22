import { prisma } from "./db";
import type { MatrixElementRule } from "./scoring";

// Used only to seed a brand-new database on first run. After that, the
// matrix lives entirely in the MatrixElement table and this constant is
// never read again — edit it in /admin/matrix instead.
const DEFAULT_MATRIX: Omit<MatrixElementRule, "sortOrder" | "id">[] = [
  {
    key: "signage",
    label: "Signage",
    description:
      "The shop's main overhead fascia sign carrying the brand's logo and brand colours. Only counts when the brand owns the sign itself — a fascia showing the shop's own trade name with no brand logo scores zero, even if the brand is heavily present elsewhere on the storefront.",
    pointsPerUnit: 10,
    maxUnits: 1,
  },
  {
    key: "full_stickers",
    label: "Full stickers",
    description:
      "A large branded sticker or panel covering a full window, door panel, or column/pillar wrap — a single continuous branded surface, typically waist-height or taller, not a printed poster behind glass.",
    pointsPerUnit: 7,
    maxUnits: 2,
  },
  {
    key: "generic_posters",
    label: "Generic posters",
    description:
      "Individual printed campaign or tariff posters displayed in the window or on the storefront (offers, prize draws, SIM plans, price lists). Roughly A4–A2 sized sheets, each one counts separately.",
    pointsPerUnit: 2.5,
    maxUnits: 3,
  },
  {
    key: "stripes",
    label: "Strips",
    description:
      "Narrow branded strips with the logo repeated along their length, applied to stair edges/step risers, door frames, shelf edges or window edges. Each separate strip run (e.g. each step) counts as one unit.",
    pointsPerUnit: 1,
    maxUnits: 3,
  },
  {
    key: "approved_reseller",
    label: "Approved reseller",
    description:
      'The reseller accreditation badge, worded "Approved Reseller" or "Authorised Reseller" depending on the brand. A small sticker or plaque stating the shop is an accredited reseller of that brand.',
    pointsPerUnit: 0.5,
    maxUnits: 1,
  },
  {
    key: "push_pull",
    label: "Push/Pull",
    description:
      'Small branded "PUSH" / "PULL" stickers on the entrance door, carrying the brand\'s logo and colours.',
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

import { computeScore, type ElementCounts, type MatrixElementRule } from "./scoring";

/** The operator the action plan is written for. */
export const HOME_BRAND = process.env.HOME_BRAND?.trim() || "Zain";

const round = (n: number) => Math.round(n * 100) / 100;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export type ActionStep = {
  key: string;
  label: string;
  /** Units the matrix still pays for (cap minus what is already counted). */
  add: number;
  pointsPerUnit: number;
  gain: number;
};

export type ActionPlan = {
  brand: string;
  present: boolean;
  score: number;
  maxScore: number;
  /** Every remaining point, best value per item first. */
  steps: ActionStep[];
  potential: number;
  /** Strongest rival at this shop, if one exists. */
  rival: { brand: string; score: number } | null;
  /** True when the home brand has the top score (ties count as leading). */
  leading: boolean;
  /** Points needed to move strictly ahead of the rival (0 when leading). */
  gapToLead: number;
  /**
   * The fewest items that put the home brand strictly ahead, picked
   * highest-value first. Null when leading, or when even a full set of
   * branding would not be enough.
   */
  toLead: { label: string; add: number; gain: number }[] | null;
};

/**
 * Turns a scored photo into concrete actions for the home brand: what to
 * add, what each item is worth under the current matrix, and the shortest
 * path to out-scoring the strongest rival at the same shop.
 */
export function actionPlan(
  brands: { brand: string; counts: ElementCounts; score: number }[],
  rules: MatrixElementRule[],
  home = HOME_BRAND,
): ActionPlan {
  const mine = brands.find((b) => same(b.brand, home));
  const breakdown = computeScore(mine?.counts ?? {}, rules);
  const score = mine ? mine.score : 0;

  const byRule = new Map(rules.map((r) => [r.key, r]));
  const steps: ActionStep[] = breakdown.lines
    .filter((l) => l.countedUnits < (byRule.get(l.key)?.maxUnits ?? 0))
    .map((l) => {
      const rule = byRule.get(l.key)!;
      const add = rule.maxUnits - l.countedUnits;
      return { key: l.key, label: l.label, add, pointsPerUnit: rule.pointsPerUnit, gain: round(add * rule.pointsPerUnit) };
    })
    .filter((s) => s.gain > 0)
    .sort((a, b) => b.pointsPerUnit - a.pointsPerUnit || b.gain - a.gain);

  const rivals = brands.filter((b) => !same(b.brand, home)).sort((a, b) => b.score - a.score);
  const rival = rivals[0] ? { brand: rivals[0].brand, score: rivals[0].score } : null;
  const leading = !rival || score >= rival.score;
  const gapToLead = leading ? 0 : round(rival.score - score);

  let toLead: ActionPlan["toLead"] = null;
  if (!leading) {
    // Greedy by points per unit, one unit at a time: the fewest physical
    // items that close the gap.
    const picked: { label: string; add: number; gain: number }[] = [];
    let gained = 0;
    for (const step of steps) {
      let units = 0;
      while (units < step.add && gained <= gapToLead) {
        units++;
        gained = round(gained + step.pointsPerUnit);
      }
      if (units > 0) picked.push({ label: step.label, add: units, gain: round(units * step.pointsPerUnit) });
      if (gained > gapToLead) break;
    }
    toLead = gained > gapToLead ? picked : null;
  }

  return {
    brand: mine?.brand ?? home,
    present: Boolean(mine),
    score,
    maxScore: breakdown.maxScore,
    steps,
    potential: round(steps.reduce((sum, s) => sum + s.gain, 0)),
    rival,
    leading,
    gapToLead,
    toLead,
  };
}

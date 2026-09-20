/**
 * Visibility Matrix — Indirect Channel (reseller shops).
 * Source: "Visibility Matrix" scoring deck. Values are fixed by the business
 * matrix, not tunable per-request — change them here, in one place, if the
 * matrix itself is revised.
 */
export const ELEMENT_KEYS = [
  "signage",
  "full_stickers",
  "generic_posters",
  "stripes",
  "approved_reseller",
  "push_pull",
] as const;

export type ElementKey = (typeof ELEMENT_KEYS)[number];

export interface ElementRule {
  key: ElementKey;
  label: string;
  description: string;
  pointsPerUnit: number;
  maxUnits: number;
  cappedMax: number;
}

export const VISIBILITY_MATRIX: Record<ElementKey, ElementRule> = {
  signage: {
    key: "signage",
    label: "Signage",
    description: "Branded storefront signage (fascia/shop sign carrying the brand).",
    pointsPerUnit: 10,
    maxUnits: 1,
    cappedMax: 10,
  },
  full_stickers: {
    key: "full_stickers",
    label: "Full stickers",
    description: "Full-coverage branded stickers applied to the storefront.",
    pointsPerUnit: 7,
    maxUnits: 2,
    cappedMax: 14,
  },
  generic_posters: {
    key: "generic_posters",
    label: "Generic posters",
    description: "Generic branded posters displayed in or around the shop.",
    pointsPerUnit: 2.5,
    maxUnits: 3,
    cappedMax: 7.5,
  },
  stripes: {
    key: "stripes",
    label: "Stripes",
    description: "Branded stripes/edging applied to the storefront.",
    pointsPerUnit: 1,
    maxUnits: 3,
    cappedMax: 3,
  },
  approved_reseller: {
    key: "approved_reseller",
    label: "Approved reseller",
    description: "\"Approved reseller\" marker/plaque displayed at the shop.",
    pointsPerUnit: 0.5,
    maxUnits: 1,
    cappedMax: 0.5,
  },
  push_pull: {
    key: "push_pull",
    label: "Push/Pull",
    description: "Branded push/pull door handle stickers.",
    pointsPerUnit: 0.25,
    maxUnits: 1,
    cappedMax: 0.25,
  },
};

export const MAX_VISIBILITY_SCORE = Object.values(VISIBILITY_MATRIX).reduce(
  (sum, rule) => sum + rule.cappedMax,
  0,
); // 35.25

export type ElementCounts = Record<ElementKey, number>;

export interface ElementScoreLine {
  key: ElementKey;
  label: string;
  detectedCount: number;
  countedUnits: number;
  points: number;
  cappedMax: number;
}

export interface ScoreBreakdown {
  lines: ElementScoreLine[];
  totalScore: number;
  maxScore: number;
  percentage: number;
}

/**
 * Deterministic scoring: takes raw per-element unit counts (from the AI
 * detector or a human reviewer) and applies the matrix's per-unit points and
 * caps. The AI never computes the score itself — it only reports counts —
 * so the numbers on screen always trace back to this one function.
 */
export function computeScore(counts: Partial<ElementCounts>): ScoreBreakdown {
  const lines: ElementScoreLine[] = ELEMENT_KEYS.map((key) => {
    const rule = VISIBILITY_MATRIX[key];
    const detectedCount = Math.max(0, Math.round(counts[key] ?? 0));
    const countedUnits = Math.min(detectedCount, rule.maxUnits);
    const points = Math.round(countedUnits * rule.pointsPerUnit * 100) / 100;
    return {
      key,
      label: rule.label,
      detectedCount,
      countedUnits,
      points,
      cappedMax: rule.cappedMax,
    };
  });

  const totalScore = Math.round(lines.reduce((sum, l) => sum + l.points, 0) * 100) / 100;

  return {
    lines,
    totalScore,
    maxScore: MAX_VISIBILITY_SCORE,
    percentage: Math.round((totalScore / MAX_VISIBILITY_SCORE) * 1000) / 10,
  };
}

export function emptyCounts(): ElementCounts {
  return ELEMENT_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as ElementCounts);
}

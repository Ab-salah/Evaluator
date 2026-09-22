/**
 * Scoring against the Visibility Matrix. The matrix itself (which elements
 * exist, their points-per-unit and caps) is data — stored in the
 * MatrixElement table and editable by the Strategy & Data Analytics team at
 * /admin/matrix — not hardcoded here. This file only holds the arithmetic:
 * given a rule set and a photo's per-element counts, compute the score.
 * The AI detector never does this math itself (see ai-vision.ts).
 */
export interface MatrixElementRule {
  id: string;
  key: string;
  label: string;
  description: string;
  pointsPerUnit: number;
  maxUnits: number;
  sortOrder: number;
}

export type ElementCounts = Record<string, number>;

export interface ElementScoreLine {
  key: string;
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

export function maxScoreFor(rules: MatrixElementRule[]): number {
  return Math.round(rules.reduce((sum, r) => sum + r.pointsPerUnit * r.maxUnits, 0) * 100) / 100;
}

/**
 * Deterministic scoring: takes raw per-element unit counts (from the AI
 * detector or a human reviewer) and applies the current matrix's per-unit
 * points and caps. Counts for a key no longer present in `rules` are
 * ignored — the matrix may have changed since the photo was scored.
 */
export function computeScore(counts: ElementCounts, rules: MatrixElementRule[]): ScoreBreakdown {
  const sortedRules = [...rules].sort((a, b) => a.sortOrder - b.sortOrder);
  const maxScore = maxScoreFor(sortedRules);

  const lines: ElementScoreLine[] = sortedRules.map((rule) => {
    const detectedCount = Math.max(0, Math.round(counts[rule.key] ?? 0));
    const countedUnits = Math.min(detectedCount, rule.maxUnits);
    const points = Math.round(countedUnits * rule.pointsPerUnit * 100) / 100;
    return {
      key: rule.key,
      label: rule.label,
      detectedCount,
      countedUnits,
      points,
      cappedMax: Math.round(rule.pointsPerUnit * rule.maxUnits * 100) / 100,
    };
  });

  const totalScore = Math.round(lines.reduce((sum, l) => sum + l.points, 0) * 100) / 100;

  return {
    lines,
    totalScore,
    maxScore,
    percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0,
  };
}

export type BrandShareLine = {
  brand: string;
  score: number;
  sharePercent: number;
};

/**
 * Share of visibility: the audited brand's score as a proportion of all
 * branded visibility scored in the same photo. This is what makes an
 * indirect-channel photo comparable across shops — an absolute score of 10
 * means something different in a shop where rivals scored 30 than in one
 * where they scored nothing.
 */
export function computeShareOfVisibility(
  audited: { brand: string; counts: ElementCounts },
  competitors: { brand: string; counts: ElementCounts }[],
  rules: MatrixElementRule[],
): BrandShareLine[] {
  const scored = [audited, ...competitors].map((entry) => ({
    brand: entry.brand,
    score: computeScore(entry.counts, rules).totalScore,
  }));

  const total = scored.reduce((sum, s) => sum + s.score, 0);

  return scored.map((s) => ({
    ...s,
    sharePercent: total > 0 ? Math.round((s.score / total) * 1000) / 10 : 0,
  }));
}

export function emptyCounts(rules: MatrixElementRule[]): ElementCounts {
  return rules.reduce((acc, r) => {
    acc[r.key] = 0;
    return acc;
  }, {} as ElementCounts);
}

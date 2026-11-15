import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import type { AiDetectionResult } from "../ai-vision";
import type { ElementCounts, MatrixElementRule } from "../scoring";
import { computeScore } from "../scoring";
import {
  auditPhoto,
  countsFor,
  DEMO_SAMPLES,
  DEMO_SHOPS,
  layoutFor,
  OPERATORS,
  operatorsIn,
  samplePhoto,
  type DemoLook,
  type Layout,
  type Operator,
} from "./catalog";
import { appealReason, notesFor, standardReason, summaryFor } from "./describe";

// The simulated AI used in demo mode. Photos from the demo set get exactly
// the counts they were drawn with; any other photo gets a plausible,
// repeatable result worked out from its bytes, so re-running gives the same
// answer.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha = (b: Buffer) => createHash("sha256").update(b).digest();
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Where the demo pictures live (public/demo, also served at /demo/...). */
export const demoFile = (file: string) => path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "demo", file);

type Known = { look: DemoLook; name: string };

let index: Promise<Map<string, Known>> | null = null;
function photoIndex(): Promise<Map<string, Known>> {
  index ??= (async () => {
    const entries: (Known & { file: string })[] = [
      ...DEMO_SHOPS.flatMap((shop) => shop.audits.map((look, i) => ({ file: auditPhoto(shop, i), look, name: shop.name }))),
      ...DEMO_SAMPLES.map((s) => ({ file: samplePhoto(s), look: s, name: s.name })),
    ];
    const map = new Map<string, Known>();
    await Promise.all(
      entries.map(async (e) => {
        try {
          map.set(sha(await readFile(/*turbopackIgnore: true*/ demoFile(e.file))).toString("hex"), e);
        } catch {
          // A missing picture just means that photo is simulated like any other.
        }
      }),
    );
    return map;
  })();
  return index;
}

function byName(name: string | null | undefined): Known | null {
  if (!name) return null;
  const sample = DEMO_SAMPLES.find((s) => same(s.name, name));
  if (sample) return { look: sample, name: sample.name };
  const shop = DEMO_SHOPS.find((s) => same(s.name, name));
  return shop ? { look: shop.audits[shop.audits.length - 1], name: shop.name } : null;
}

// Small seeded random generator (mulberry32), so results repeat per photo.
function rng(seed: Buffer) {
  let a = seed.readUInt32LE(0);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = [
  "Al Waha Mobile", "Diamond Phones", "City Center Telecom", "Smart Zone", "Al Fajer Electronics", "Phone Plaza",
  "Mobile Hub", "Al Amal Communications", "Blue Wave Mobile", "Gulf Phones", "Al Manar Telecom", "Prime Mobile",
  "Royal Phones", "Al Salam Mobile", "Victory Electronics", "Next Mobile", "Galaxy Phone Center", "Al Bustan Telecom",
  "Crystal Mobile", "Al Reef Phones",
];

function randomLook(rand: () => number): DemoLook {
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  let present = OPERATORS.filter((_, i) => rand() < [0.9, 0.75, 0.6][i]);
  if (present.length === 0) present = ["Zain"];
  const brands: DemoLook["brands"] = {};
  for (const op of present) {
    brands[op] = {
      full_stickers: pick([0, 0, 1, 1, 2]),
      generic_posters: pick([0, 1, 1, 2, 2, 3]),
      stripes: pick([0, 0, 0, 1, 2, 3]),
      approved_reseller: rand() < 0.5 ? 1 : 0,
    };
    if (!Object.values(brands[op]!).some(Boolean)) brands[op]!.generic_posters = 1;
  }
  if (rand() < 0.4) brands[pick(present)]!.push_pull = 1;
  const appeal = 4 + Math.floor(rand() * 6);
  return {
    fascia: rand() < 0.5 ? pick(present) : null,
    brands,
    confidence: pick(["high", "high", "medium", "medium", "low"] as const),
    appeal,
    standard: Math.max(3, Math.min(9, appeal + pick([-1, 0, 0, 1]))),
  };
}

function safeLayout(look: DemoLook): Layout | null {
  try {
    return layoutFor(look);
  } catch {
    return null;
  }
}

/**
 * Builds a full AI-style result for a look, mapped onto the current matrix.
 * Only the drawn demo photos get notes naming where each item is; for any
 * other photo the notes stay general, since nothing was really located.
 */
export function detectionFor(look: DemoLook, rules: MatrixElementRule[], shopName: string | null, extra?: () => number): AiDetectionResult {
  const layout = extra ? null : safeLayout(look);
  const brands = operatorsIn(look).map((op: Operator) => {
    const known = countsFor(look, op);
    // Elements an admin added to the matrix get a small random count for
    // unknown photos, and none for the drawn demo photos.
    const counts: ElementCounts = Object.fromEntries(
      rules.map((r) => [r.key, r.key in known ? known[r.key] : extra ? Math.floor(extra() * (r.maxUnits + 1)) : 0]),
    );
    const notes = notesFor(look, op, layout);
    const reasoning = Object.fromEntries(rules.filter((r) => (counts[r.key] ?? 0) > 0).map((r) => [r.key, notes[r.key] ?? `${op} ${r.label.toLowerCase()} visible on the shop front.`]));
    return { brand: op, counts, reasoning };
  });
  const scores = brands.map((b) => ({ brand: b.brand, score: computeScore(b.counts, rules).totalScore }));
  return {
    shopName,
    brands,
    overallSummary: summaryFor(look, scores),
    confidence: look.confidence,
    customerAppeal: { score: look.appeal, reasoning: appealReason(look.appeal) },
    industryStandard: { score: look.standard, reasoning: standardReason(look.standard) },
  };
}

/** Simulated "read the name off the sign". */
export async function simulateShopName(image: Buffer, sampleSlug?: string | null): Promise<string> {
  await sleep(900 + Math.random() * 700);
  const sample = DEMO_SAMPLES.find((s) => s.slug === sampleSlug);
  if (sample) return sample.name;
  const digest = sha(image);
  const known = (await photoIndex()).get(digest.toString("hex"));
  return known ? known.name : NAMES[digest.readUInt32LE(4) % NAMES.length];
}

/** Simulated full scoring of one photo. */
export async function simulateDetection(params: {
  image: Buffer;
  shopName: string | null;
  rules: MatrixElementRule[];
}): Promise<AiDetectionResult> {
  await sleep(4500 + Math.random() * 2500);
  const digest = sha(params.image);
  const known = (await photoIndex()).get(digest.toString("hex")) ?? byName(params.shopName);
  if (known) return detectionFor(known.look, params.rules, known.name);
  const rand = rng(digest);
  return detectionFor(randomLook(rand), params.rules, NAMES[digest.readUInt32LE(4) % NAMES.length], rand);
}

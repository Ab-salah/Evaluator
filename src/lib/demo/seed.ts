import { readFile } from "fs/promises";
import { prisma } from "../db";
import { hashPassword } from "../password";
import { getMatrixRules } from "../matrix";
import { computeScore } from "../scoring";
import { deleteSubmissionImage, saveSubmissionImage } from "../storage";
import { scoreSubmission } from "../scoring-job";
import {
  auditPhoto,
  countsFor,
  DEMO_PASSWORD,
  DEMO_SHOPS,
  DEMO_USERS,
  layoutFor,
  operatorsIn,
  type DemoUserKey,
} from "./catalog";
import { appealReason, notesFor, standardReason, summaryFor } from "./describe";
import { DEMO_MODE } from "./mode";
import { demoFile } from "./simulate";

const SEEDED = "demo.seededAt";
const DAY = 24 * 60 * 60 * 1000;
const STARTED = Date.now();

let ready: Promise<void> | null = null;

/**
 * Demo mode only: makes sure the demo accounts exist and, the first time,
 * loads the sample shops and audits. Runs once per server start.
 */
export function ensureDemoData(): Promise<void> {
  if (!DEMO_MODE) return Promise.resolve();
  ready ??= setUp().catch((err) => {
    ready = null; // try again on the next request
    console.error("[demo] could not load the sample data:", err);
  });
  return ready;
}

async function setUp() {
  const users = await upsertDemoUsers(false);
  const seeded = await prisma.appSetting.findUnique({ where: { key: SEEDED } });
  if (!seeded) {
    await seedAudits(users);
    await prisma.appSetting.upsert({
      where: { key: SEEDED },
      create: { key: SEEDED, value: new Date().toISOString(), updatedBy: "demo" },
      update: { value: new Date().toISOString() },
    });
    console.log("[demo] sample shops and audits loaded");
  }
  // Photos that were still being scored when the server stopped: finish them.
  const orphans = await prisma.submission.findMany({
    where: { status: "PENDING", createdAt: { lt: new Date(STARTED) } },
    select: { id: true },
  });
  for (const o of orphans) void scoreSubmission(o.id);
}

async function upsertDemoUsers(reset: boolean) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const ids = {} as Record<DemoUserKey, string>;
  for (const [key, u] of Object.entries(DEMO_USERS) as [DemoUserKey, (typeof DEMO_USERS)[DemoUserKey]][]) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: { email: u.email, name: u.name, role: u.role, passwordHash },
      update: reset ? { name: u.name, role: u.role, passwordHash, active: true } : {},
    });
    ids[key] = user.id;
  }
  return ids;
}

async function seedAudits(users: Record<DemoUserKey, string>) {
  const rules = await getMatrixRules();
  const now = Date.now();

  for (const [s, shop] of DEMO_SHOPS.entries()) {
    const row =
      (await prisma.shop.findUnique({ where: { code: shop.code } })) ??
      (await prisma.shop.create({ data: { name: shop.name, code: shop.code, city: shop.city, region: shop.region, address: shop.landmark } }));

    for (const [i, audit] of shop.audits.entries()) {
      // Spread visits through the working day so lists don't look machine-made.
      const when = new Date(Math.min(now - 30 * 60_000, now - audit.daysAgo * DAY - ((s * 97 + i * 53) % 420) * 60_000));
      const imagePath = await saveSubmissionImage(await readFile(/*turbopackIgnore: true*/ demoFile(auditPhoto(shop, i))), "image/jpeg");
      const layout = layoutFor(audit);
      const brands = operatorsIn(audit).map((op) => {
        const finalCounts = countsFor(audit, op);
        const aiCounts = audit.aiCounted?.[op] ? countsFor(audit, op, audit.aiCounted) : finalCounts;
        return {
          brand: op,
          aiCounts,
          aiScore: computeScore(aiCounts, rules).totalScore,
          reasoning: notesFor(audit, op, layout),
          finalCounts,
          finalScore: computeScore(finalCounts, rules).totalScore,
        };
      });
      const reviewed = audit.status === "REVIEWED";

      await prisma.submission.create({
        data: {
          shopId: row.id,
          submittedById: users[audit.by],
          imagePath,
          latitude: shop.lat + (((s + i * 7) % 5) - 2) * 0.00012,
          longitude: shop.lng + (((s * 3 + i) % 5) - 2) * 0.00012,
          locationLabel: shop.landmark,
          capturedAt: when,
          createdAt: when,
          status: audit.status,
          aiSummary: summaryFor(audit, brands.map((b) => ({ brand: b.brand, score: b.aiScore }))),
          aiConfidence: audit.confidence,
          subjectiveRatings: {
            customerAppeal: { score: audit.appeal, reasoning: appealReason(audit.appeal) },
            industryStandard: { score: audit.standard, reasoning: standardReason(audit.standard) },
          },
          reviewedById: reviewed ? users.noor : null,
          reviewedAt: reviewed ? new Date(Math.min(now - 60_000, when.getTime() + 3 * 60 * 60_000)) : null,
          reviewNotes: reviewed ? (audit.note ?? null) : null,
          brandScores: { create: brands },
        },
      });
    }
  }
}

/**
 * Demo mode only: puts the demo back to its starting point. Deletes every
 * audit, shop and photo, restores the default matrix and the demo accounts
 * (removing any other account except the one doing the reset), then loads
 * the sample data again.
 */
export async function resetDemoData(keepUserId: string): Promise<void> {
  if (!DEMO_MODE) throw new Error("Only available in demo mode.");
  const photos = await prisma.submission.findMany({ select: { imagePath: true } });
  await prisma.$transaction([
    prisma.brandScore.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.shop.deleteMany(),
    prisma.matrixElement.deleteMany(),
    prisma.appSetting.deleteMany({ where: { key: SEEDED } }),
  ]);
  await Promise.all(photos.map((p) => deleteSubmissionImage(p.imagePath).catch(() => {})));
  const emails = Object.values(DEMO_USERS).map((u) => u.email);
  await prisma.user.deleteMany({ where: { email: { notIn: emails }, id: { not: keepUserId } } });
  await upsertDemoUsers(true);
  ready = null;
  await ensureDemoData();
}

import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai-vision";
import { scoreSubmission } from "@/lib/scoring-job";
import { bad } from "@/lib/http";

/** Admin: re-run AI scoring (after a failure, a stuck run, or a matrix change). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiUser("ADMIN");
  if (auth.error) return auth.error;
  if (!aiEnabled()) return bad("AI scoring is not configured on this server.", 409);

  const { id } = await params;
  const updated = await prisma.submission.updateMany({ where: { id }, data: { status: "PENDING", aiSummary: null } });
  if (updated.count === 0) return bad("Not found", 404);

  after(() => scoreSubmission(id));
  return Response.json({ ok: true }, { status: 202 });
}

import { prisma } from "@/lib/db";

// Liveness + database check for Docker / load balancers. Public, no data.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "database unreachable" }, { status: 503 });
  }
}

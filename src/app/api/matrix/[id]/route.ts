import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readBody } from "@/lib/http";
import { apiUser } from "@/lib/auth";

// Prisma's "record to update/delete does not exist" error.
const isNotFound = (err: unknown) => (err as { code?: unknown } | null)?.code === "P2025";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiUser("ADMIN");
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await readBody(req);
  if (!body) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const data: {
    label?: string;
    description?: string;
    pointsPerUnit?: number;
    maxUnits?: number;
    sortOrder?: number;
  } = {};

  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) return NextResponse.json({ error: "label cannot be empty" }, { status: 400 });
    data.label = label;
  }
  if (body.description !== undefined) {
    data.description = String(body.description).trim();
  }
  if (body.pointsPerUnit !== undefined) {
    const pointsPerUnit = Number(body.pointsPerUnit);
    if (!Number.isFinite(pointsPerUnit) || pointsPerUnit <= 0) {
      return NextResponse.json({ error: "pointsPerUnit must be a positive number" }, { status: 400 });
    }
    data.pointsPerUnit = pointsPerUnit;
  }
  if (body.maxUnits !== undefined) {
    const maxUnits = Number(body.maxUnits);
    if (!Number.isInteger(maxUnits) || maxUnits <= 0) {
      return NextResponse.json({ error: "maxUnits must be a positive integer" }, { status: 400 });
    }
    data.maxUnits = maxUnits;
  }
  if (body.sortOrder !== undefined) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isInteger(sortOrder)) {
      return NextResponse.json({ error: "sortOrder must be an integer" }, { status: 400 });
    }
    data.sortOrder = sortOrder;
  }

  try {
    const element = await prisma.matrixElement.update({ where: { id }, data });
    return NextResponse.json({ element });
  } catch (err) {
    // Only a missing row is a 404; anything else (e.g. the database being
    // down) must surface as a real error, not be disguised as "not found".
    if (isNotFound(err)) {
      return NextResponse.json({ error: "Matrix element not found" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiUser("ADMIN");
  if (auth.error) return auth.error;
  const { id } = await params;
  try {
    await prisma.matrixElement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Only a missing row is a 404; anything else (e.g. the database being
    // down) must surface as a real error, not be disguised as "not found".
    if (isNotFound(err)) {
      return NextResponse.json({ error: "Matrix element not found" }, { status: 404 });
    }
    throw err;
  }
}

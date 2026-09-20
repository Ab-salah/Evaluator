import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMatrixRules } from "@/lib/matrix";

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export async function GET() {
  const rules = await getMatrixRules();
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const key = String(body.key ?? "").trim();
  const label = String(body.label ?? "").trim();
  const description = String(body.description ?? "").trim();
  const pointsPerUnit = Number(body.pointsPerUnit);
  const maxUnits = Number(body.maxUnits);

  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json(
      { error: "key must be lowercase letters, numbers and underscores, starting with a letter" },
      { status: 400 },
    );
  }
  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  if (!Number.isFinite(pointsPerUnit) || pointsPerUnit <= 0) {
    return NextResponse.json({ error: "pointsPerUnit must be a positive number" }, { status: 400 });
  }
  if (!Number.isInteger(maxUnits) || maxUnits <= 0) {
    return NextResponse.json({ error: "maxUnits must be a positive integer" }, { status: 400 });
  }

  const existing = await prisma.matrixElement.findUnique({ where: { key } });
  if (existing) {
    return NextResponse.json({ error: `An element with key "${key}" already exists` }, { status: 409 });
  }

  const maxSortOrder = await prisma.matrixElement.aggregate({ _max: { sortOrder: true } });

  const element = await prisma.matrixElement.create({
    data: {
      key,
      label,
      description,
      pointsPerUnit,
      maxUnits,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ element }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

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
    data.sortOrder = Number(body.sortOrder);
  }

  try {
    const element = await prisma.matrixElement.update({ where: { id }, data });
    return NextResponse.json({ element });
  } catch {
    return NextResponse.json({ error: "Matrix element not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.matrixElement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Matrix element not found" }, { status: 404 });
  }
}

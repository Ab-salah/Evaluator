import { NextRequest } from "next/server";

/** Parses a JSON request body, returning null (not throwing) when it is missing or malformed. */
export async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

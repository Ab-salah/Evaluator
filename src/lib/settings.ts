import { prisma } from "./db";

// Admin-editable server settings (stored in the AppSetting table). A value
// saved in the app wins over the matching environment variable, so the AI key
// can be added or changed from /admin/settings without touching the server.

const KEY_API = "ai.apiKey";
const KEY_MODEL = "ai.model";

export const DEFAULT_MODEL = "claude-opus-5-5";
export const MODEL_CHOICES = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "Most accurate counts. Recommended." },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "Faster and cheaper, slightly less thorough." },
] as const;

export type AiConfig = {
  apiKey: string | null;
  model: string;
  /** Where the key came from: saved in the app, the server's environment, or nowhere. */
  keySource: "app" | "env" | null;
  /** Last 4 characters only, safe to show in the browser. */
  keyHint: string | null;
};

// Short cache so every page view doesn't hit the database; cleared on save.
const TTL_MS = 30_000;
let cached: { at: number; value: AiConfig } | null = null;

export async function getAiConfig(): Promise<AiConfig> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  let saved = new Map<string, string>();
  try {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: [KEY_API, KEY_MODEL] } } });
    saved = new Map(rows.map((r) => [r.key, r.value]));
  } catch (err) {
    // Settings table missing (migration not applied yet): fall back to env.
    console.error("[settings] could not read settings:", err);
  }

  const appKey = saved.get(KEY_API)?.trim() || null;
  const envKey = process.env.ANTHROPIC_API_KEY?.trim() || null;
  const apiKey = appKey ?? envKey;
  const value: AiConfig = {
    apiKey,
    model: saved.get(KEY_MODEL)?.trim() || process.env.AI_MODEL?.trim() || DEFAULT_MODEL,
    keySource: appKey ? "app" : envKey ? "env" : null,
    keyHint: apiKey ? apiKey.slice(-4) : null,
  };
  cached = { at: Date.now(), value };
  return value;
}

async function put(key: string, value: string | null, by: string) {
  if (value === null) await prisma.appSetting.deleteMany({ where: { key } });
  else await prisma.appSetting.upsert({ where: { key }, create: { key, value, updatedBy: by }, update: { value, updatedBy: by } });
  cached = null;
}

export const saveApiKey = (apiKey: string | null, by: string) => put(KEY_API, apiKey, by);
export const saveModel = (model: string, by: string) => put(KEY_MODEL, model, by);

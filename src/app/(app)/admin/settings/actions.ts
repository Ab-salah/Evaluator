"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { testAiConnection } from "@/lib/ai-vision";
import { MODEL_CHOICES, saveApiKey, saveModel } from "@/lib/settings";
import type { FormState } from "@/app/actions/auth";

async function admin() {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") throw new Error("Only admins can change settings.");
  return me;
}

function refresh() {
  // The AI on/off state shows on several pages.
  revalidatePath("/", "layout");
}

export async function saveAiSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await admin();
  const apiKey = String(form.get("apiKey") ?? "").trim();
  const model = String(form.get("model") ?? "");

  if (!MODEL_CHOICES.some((m) => m.id === model)) return { error: "Pick one of the listed models." };
  if (apiKey && !/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
    return { error: "That doesn't look like an Anthropic API key. It should start with sk-ant-." };
  }

  await saveModel(model, me.email);
  if (apiKey) await saveApiKey(apiKey, me.email);
  refresh();

  // Check straight away, so a bad key or blocked network shows up here and
  // not as a failed audit later.
  const problem = await testAiConnection();
  if (problem) return { error: `Saved, but the test call failed: ${problem}` };
  return { ok: apiKey ? "API key saved and working. AI scoring is on." : "Model saved and the connection works." };
}

export async function testAiSettings(): Promise<FormState> {
  await admin();
  const problem = await testAiConnection();
  return problem ? { error: problem } : { ok: "Connection works. The key and model are both accepted." };
}

export async function removeApiKey(): Promise<FormState> {
  const me = await admin();
  await saveApiKey(null, me.email);
  refresh();
  return { ok: "The key saved in the app was removed." };
}

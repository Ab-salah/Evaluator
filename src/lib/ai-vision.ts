import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { ElementCounts, MatrixElementRule } from "./scoring";
import type { SupportedMediaType } from "./storage";
import { getAiConfig } from "./settings";

// AI is optional: without a key the app runs as a manual scoring tool and
// admins enter counts themselves. The key and model come from
// /admin/settings, or from ANTHROPIC_API_KEY / AI_MODEL on the server.
export async function aiEnabled(): Promise<boolean> {
  return Boolean((await getAiConfig()).apiKey);
}

let client: { key: string; instance: Anthropic } | null = null;
async function getClient(): Promise<{ client: Anthropic; model: string }> {
  const config = await getAiConfig();
  if (!config.apiKey) {
    throw new Error("AI scoring is switched off: no API key has been added. An admin can add one under Settings.");
  }
  // Rebuilt whenever the key changes, so a key saved in Settings takes
  // effect straight away.
  if (client?.key !== config.apiKey) {
    client = { key: config.apiKey, instance: new Anthropic({ apiKey: config.apiKey, maxRetries: 2 }) };
  }
  return { client: client.instance, model: config.model };
}

/**
 * Checks the key and model without spending tokens: looks the model up.
 * Returns null when everything works, otherwise a readable problem.
 */
export async function testAiConnection(): Promise<string | null> {
  try {
    const { client, model } = await getClient();
    await client.models.retrieve(model, null, { timeout: 20_000, maxRetries: 0 });
    return null;
  } catch (err) {
    return describeAiError(err);
  }
}

// On a safety-classifier decline the API re-runs the request on a suitable
// fallback model inside the same call, instead of the audit failing.
const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

export type BrandDetection = {
  brand: string;
  counts: ElementCounts;
  reasoning: Record<string, string>;
};

export type SubjectiveRating = { score: number; reasoning: string };

export interface AiDetectionResult {
  shopName: string | null;
  brands: BrandDetection[];
  overallSummary: string;
  confidence: "low" | "medium" | "high";
  customerAppeal: SubjectiveRating;
  industryStandard: SubjectiveRating;
}

const SHOP_NAME_RULE =
  "The shop's name is its own trade name as written on its main fascia sign (prefer the Latin-script version if the sign shows one, otherwise write it as shown, e.g. in Arabic). Telecom operator brand names such as Zain, stc or Batelco are brands the shop sells, not its name, unless the sign shows no other name at all. Use null only if no shop name is legible anywhere.";

function buildSystemPrompt(rules: MatrixElementRule[], knownBrands: string[]): string {
  const rows = rules.map((rule) => `- "${rule.key}" (${rule.label}): ${rule.description}`).join("\n");
  const naming =
    knownBrands.length > 0
      ? `\n- Operators already on record: ${knownBrands.join(", ")}. When a brand in the photo is one of these, use exactly that spelling.`
      : "";

  return `You are a field auditor for an indirect (reseller) sales channel. You inspect one photo of a reseller shop and score the branded visibility of every operator present.

Reseller shops almost always carry several operators' branding at the same time: the same storefront can show one operator's signage, another's window stickers and a third's door stickers. Identify every operator whose branding is visible, and count each operator's elements separately, attributing every element to the operator that owns it by its logo, wordmark and brand colours.

The elements to count, per operator:
${rows}

Rules:
- Return one entry in "brands" per operator visible in the photo, with its own counts for every element key. Do not list an operator whose branding is not visible.
- Count what is physically visible in THIS photo. Do not infer elements that are out of frame, and do not count the same physical element twice or for two operators.
- Judge each element on the definition above, not on how prominent the operator feels overall.
- Report raw counts only, never points, scores or totals. Scoring happens outside this call.
- In each operator's "reasoning", give one short note per element counted 1 or more times, saying what you saw and where; use an empty string for elements counted 0.
- Name operators by their brand name as written on the branding (e.g. the wordmark), not the shop's own name.${naming}
- If the photo is blurry, dark, or too distant to judge reliably, still give your best counts and set confidence to "low".

Also report "shop_name". ${SHOP_NAME_RULE}

Beside the matrix count, also give two independent 1-10 ratings of the shop as a whole (not tied to any one operator):
- "customer_appeal": if an ordinary customer walked past or into this shop, how inviting, clean, organised and trustworthy would the storefront look to them? Judge lighting, clutter, tidiness and general presentation. A shop can score low here even with heavy branding if it looks crowded or run-down, and score high with minimal branding if it looks sharp and well-kept.
- "industry_standard": compared to well-run reseller/retail shops in this industry generally, how does this shop's visual merchandising measure up to normal professional practice?
For each, give the integer score and one or two sentences of reasoning grounded in what's visible in the photo.

Writing style for every text field: plain sentences, and never use em dashes or en dashes; use commas, colons or full stops instead.`;
}

/** House style: no em/en dashes in anything the AI writes. */
function plain(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/(\d)\s*–\s*(\d)/g, "$1 to $2")
    .replace(/\s*–\s*/g, ", ");
}

function imageBlock(imageBase64: string, mediaType: SupportedMediaType) {
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: mediaType, data: imageBase64 },
  };
}

function ensureAnswered(response: { stop_reason: string | null }) {
  if (response.stop_reason === "refusal") {
    throw new Error("The AI declined to analyse this photo. Please score it manually.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("The AI response was cut off before it finished. Try re-running AI scoring.");
  }
}

export async function detectBrandVisibility(params: {
  imageBase64: string;
  mediaType: SupportedMediaType;
  rules: MatrixElementRule[];
  knownBrands: string[];
}): Promise<AiDetectionResult> {
  const { rules } = params;

  const CountsSchema = z.object(
    Object.fromEntries(
      rules.map((rule) => [rule.key, z.number().int().min(0).describe(`Number of "${rule.label}" instances visible.`)]),
    ),
  );
  // One note per element key. A free-form record can't be used here:
  // structured outputs compile it to an object with no allowed properties.
  const ReasoningSchema = z.object(
    Object.fromEntries(
      rules.map((rule) => [rule.key, z.string().describe(`What was seen for "${rule.label}" and where; empty string if none.`)]),
    ),
  );
  const RatingSchema = z.object({ score: z.number().int().min(1).max(10), reasoning: z.string() });

  const DetectionSchema = z.object({
    shop_name: z.string().nullable(),
    brands: z.array(z.object({ brand: z.string(), counts: CountsSchema, reasoning: ReasoningSchema })),
    overall_summary: z.string(),
    confidence: z.enum(["low", "medium", "high"]),
    customer_appeal: RatingSchema,
    industry_standard: RatingSchema,
  });

  const { client, model } = await getClient();
  const response = await client.beta.messages.parse(
    {
      model,
      max_tokens: 16000,
      ...FALLBACK,
      system: buildSystemPrompt(rules, params.knownBrands),
      messages: [
        {
          role: "user",
          content: [
            imageBlock(params.imageBase64, params.mediaType),
            { type: "text", text: "Audit this reseller shop photo and report each operator's visibility element counts." },
          ],
        },
      ],
      output_config: { effort: "high", format: betaZodOutputFormat(DetectionSchema) },
    },
    { timeout: 5 * 60_000 },
  );

  ensureAnswered(response);
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("AI response could not be parsed into visibility counts.");

  return {
    shopName: parsed.shop_name?.trim() || null,
    brands: parsed.brands.map((b) => ({
      brand: b.brand,
      counts: rules.reduce((acc, rule) => {
        acc[rule.key] = Math.max(0, Math.round(b.counts[rule.key] ?? 0));
        return acc;
      }, {} as ElementCounts),
      reasoning: Object.fromEntries(
        Object.entries(b.reasoning as Record<string, string>)
          .filter(([, note]) => note.trim() !== "")
          .map(([key, note]) => [key, plain(note)]),
      ),
    })),
    overallSummary: plain(parsed.overall_summary),
    confidence: parsed.confidence,
    customerAppeal: { ...parsed.customer_appeal, reasoning: plain(parsed.customer_appeal.reasoning) },
    industryStandard: { ...parsed.industry_standard, reasoning: plain(parsed.industry_standard.reasoning) },
  };
}

const ShopNameSchema = z.object({ shop_name: z.string().nullable() });

/**
 * Reads the shop's trade name off its sign the moment a photo is picked, so
 * the rep sees (and can correct) it before submitting. Scoring reads it too,
 * as a safety net, so a failure here never leaves a shop unnamed.
 */
export async function readShopName(params: {
  imageBase64: string;
  mediaType: SupportedMediaType;
}): Promise<string | null> {
  const { client, model } = await getClient();
  const response = await client.beta.messages.parse(
    {
      model,
      max_tokens: 4000,
      ...FALLBACK,
      system: `You read the trade name of a shop from a photo of its storefront. ${SHOP_NAME_RULE}`,
      messages: [
        {
          role: "user",
          content: [imageBlock(params.imageBase64, params.mediaType), { type: "text", text: "What is this shop's name?" }],
        },
      ],
      output_config: { effort: "low", format: betaZodOutputFormat(ShopNameSchema) },
    },
    { timeout: 90_000 },
  );
  ensureAnswered(response);
  return response.parsed_output?.shop_name?.trim() || null;
}

/** Turns SDK errors into a sentence an admin can act on. */
export function describeAiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "The API key was rejected. Check the key under Settings.";
  if (err instanceof Anthropic.PermissionDeniedError) return "The Anthropic API key does not have access to this model.";
  if (err instanceof Anthropic.NotFoundError) return "The selected AI model was not found for this API key. Pick another model under Settings.";
  if (err instanceof Anthropic.RateLimitError) return "The AI service is rate-limited right now. Try again in a minute.";
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "No answer from the AI service in time. If this keeps happening, the server probably can't reach api.anthropic.com (check its internet or proxy settings).";
  if (err instanceof Anthropic.APIConnectionError) {
    return "Could not reach the AI service (api.anthropic.com). The server needs internet access; behind a company proxy, set HTTPS_PROXY on the server.";
  }
  if (err instanceof Anthropic.APIError) return `AI service error (${err.status ?? "unknown"}): ${err.message}`;
  return (err as Error)?.message || "Unknown AI error.";
}

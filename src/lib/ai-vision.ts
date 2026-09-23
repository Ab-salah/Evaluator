import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ElementCounts, MatrixElementRule } from "./scoring";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type MediaType = "image/jpeg" | "image/png" | "image/webp";

export type BrandDetection = {
  brand: string;
  counts: ElementCounts;
  reasoning: Record<string, string>;
};

export interface AiDetectionResult {
  brands: BrandDetection[];
  overallSummary: string;
  confidence: "low" | "medium" | "high";
}

function buildSystemPrompt(rules: MatrixElementRule[], knownBrands: string[]): string {
  const rows = rules
    .map((rule) => `- "${rule.key}" (${rule.label}): ${rule.description}`)
    .join("\n");
  const naming =
    knownBrands.length > 0
      ? `\n- Operators already on record: ${knownBrands.join(", ")}. When a brand in the photo is one of these, use exactly that spelling.`
      : "";

  return `You are a field auditor for an indirect (reseller) sales channel. You inspect one photo of a reseller shop and score the branded visibility of every operator present.

Reseller shops almost always carry several operators' branding at the same time — the same storefront can show one operator's signage, another's window stickers and a third's door stickers. Identify every operator whose branding is visible, and count each operator's elements separately, attributing every element to the operator that owns it by its logo, wordmark and brand colours.

The elements to count, per operator:
${rows}

Rules:
- Return one entry in "brands" per operator visible in the photo, with its own counts for every element key. Do not list an operator whose branding is not visible.
- Count what is physically visible in THIS photo. Do not infer elements that are out of frame, and do not count the same physical element twice or for two operators.
- Judge each element on the definition above, not on how prominent the operator feels overall.
- Report raw counts only — never points, scores or totals. Scoring happens outside this call.
- In each operator's "reasoning", add one short note per element counted 1 or more times, saying what you saw and where.
- Name operators by their brand name as written on the branding (e.g. the wordmark), not the shop's own name.${naming}
- If the photo is blurry, dark, or too distant to judge reliably, still give your best counts and set confidence to "low".`;
}

export async function detectBrandVisibility(params: {
  imageBase64: string;
  mediaType: MediaType;
  rules: MatrixElementRule[];
  knownBrands: string[];
}): Promise<AiDetectionResult> {
  const { rules } = params;

  const CountsSchema = z.object(
    Object.fromEntries(
      rules.map((rule) => [
        rule.key,
        z.number().int().min(0).describe(`Number of "${rule.label}" instances visible.`),
      ]),
    ),
  );

  const DetectionSchema = z.object({
    brands: z.array(
      z.object({
        brand: z.string(),
        counts: CountsSchema,
        reasoning: z.record(z.string(), z.string()),
      }),
    ),
    overall_summary: z.string(),
    confidence: z.enum(["low", "medium", "high"]),
  });

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8192,
    system: buildSystemPrompt(rules, params.knownBrands),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: params.mediaType, data: params.imageBase64 },
          },
          {
            type: "text",
            text: "Audit this reseller shop photo and report each operator's visibility element counts.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(DetectionSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("AI response could not be parsed into visibility counts.");
  }

  return {
    brands: parsed.brands.map((b) => ({
      brand: b.brand,
      counts: rules.reduce((acc, rule) => {
        acc[rule.key] = Math.max(0, Math.round(b.counts[rule.key] ?? 0));
        return acc;
      }, {} as ElementCounts),
      reasoning: b.reasoning,
    })),
    overallSummary: parsed.overall_summary,
    confidence: parsed.confidence,
  };
}

const ShopNameSchema = z.object({
  shop_name: z
    .string()
    .nullable()
    .describe("The shop's own trade name as written on its sign, or null if not legible."),
});

/**
 * Reads the shop's trade name off its fascia sign, to prefill the submit
 * form. Deliberately separate from scoring: it runs the moment a photo is
 * picked, so the rep sees (and can correct) the name before submitting.
 */
export async function readShopName(params: {
  imageBase64: string;
  mediaType: MediaType;
}): Promise<string | null> {
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 1024,
    system:
      "You read the trade name of a shop from a photo of its storefront. Return the shop's own name as written on its main sign (in Latin script if the sign shows one, otherwise as written). Telecom operator brand names such as Zain, stc or Batelco are not the shop's name — they are brands the shop sells — unless the sign shows no other name at all. Return null if no shop name is legible.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: params.mediaType, data: params.imageBase64 },
          },
          { type: "text", text: "What is this shop's name?" },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ShopNameSchema), effort: "low" },
  });

  const name = response.parsed_output?.shop_name?.trim();
  return name ? name : null;
}

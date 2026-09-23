import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ElementCounts, MatrixElementRule } from "./scoring";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type CompetitorDetection = {
  brand: string;
  counts: ElementCounts;
};

export interface AiDetectionResult {
  counts: ElementCounts;
  reasoning: Record<string, string>;
  competitors: CompetitorDetection[];
  overallSummary: string;
  confidence: "low" | "medium" | "high";
}

function buildSystemPrompt(rules: MatrixElementRule[], brand: string): string {
  const rows = rules
    .map((rule) => `- "${rule.key}" (${rule.label}): ${rule.description}`)
    .join("\n");

  return `You are a field auditor for an indirect (reseller) sales channel. You inspect one photo of a reseller shop and count the branded visibility elements present.

You are auditing for the brand: ${brand}.

Reseller shops almost always carry several competing brands at the same time — the same storefront can show one brand's signage, another's window stickers and a third's door stickers. So every element you count must be attributed to the brand that owns it, by its logo, wordmark and brand colours.

The elements to count:
${rows}

Rules:
- In "counts", report ONLY elements belonging to ${brand}. Elements belonging to any other brand must NOT appear there.
- In "competitors", report the other brands visible in the photo and their own element counts, using the same element keys. Omit this entirely if ${brand} is the only brand visible.
- Count what is physically visible in THIS photo. Do not infer elements that are out of frame, and do not count the same physical element twice.
- Judge each element on the definition above, not on how prominent the brand feels overall.
- Report raw counts only — never points, scores or totals. Scoring happens outside this call.
- In "reasoning", add one short note per ${brand} element you counted 1 or more of, saying what you saw and where.
- If the photo is blurry, dark, or too distant to judge reliably, still give your best counts and set confidence to "low".`;
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
  mediaType: "image/jpeg" | "image/png" | "image/webp";
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

export async function detectVisibilityElements(params: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  rules: MatrixElementRule[];
  brand: string;
}): Promise<AiDetectionResult> {
  const { rules, brand } = params;

  const countsShape = Object.fromEntries(
    rules.map((rule) => [
      rule.key,
      z.number().int().min(0).describe(`Number of "${rule.label}" instances visible.`),
    ]),
  );
  const CountsSchema = z.object(countsShape);

  const DetectionSchema = z.object({
    counts: CountsSchema,
    reasoning: z.record(z.string(), z.string()),
    competitors: z.array(z.object({ brand: z.string(), counts: CountsSchema })),
    overall_summary: z.string(),
    confidence: z.enum(["low", "medium", "high"]),
  });

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: buildSystemPrompt(rules, brand),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mediaType,
              data: params.imageBase64,
            },
          },
          {
            type: "text",
            text: `Audit this reseller shop photo for ${brand} and report the visibility element counts.`,
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

  const normalize = (raw: Record<string, number>): ElementCounts =>
    rules.reduce((acc, rule) => {
      acc[rule.key] = Math.max(0, Math.round(raw[rule.key] ?? 0));
      return acc;
    }, {} as ElementCounts);

  return {
    counts: normalize(parsed.counts),
    reasoning: parsed.reasoning,
    competitors: parsed.competitors.map((c) => ({
      brand: c.brand,
      counts: normalize(c.counts),
    })),
    overallSummary: parsed.overall_summary,
    confidence: parsed.confidence,
  };
}

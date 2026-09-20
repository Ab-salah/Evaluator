import Anthropic from "@anthropic-ai/sdk";
import { ELEMENT_KEYS, VISIBILITY_MATRIX, type ElementCounts } from "./scoring";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AiDetectionResult {
  counts: ElementCounts;
  reasoning: Record<string, string>;
  overallSummary: string;
  confidence: "low" | "medium" | "high";
}

const REPORT_TOOL_NAME = "report_visibility_counts";

function buildSystemPrompt(): string {
  const rows = ELEMENT_KEYS.map((key) => {
    const rule = VISIBILITY_MATRIX[key];
    return `- "${key}" (${rule.label}): ${rule.description} Counts up to ${rule.maxUnits} unit(s); each unit is worth ${rule.pointsPerUnit} points.`;
  }).join("\n");

  return `You are a field auditor for a consumer brand's indirect (reseller) channel. You inspect a single photo of a reseller shop's storefront and count how many instances of each branded visibility element are visibly present, per this matrix:

${rows}

Rules:
- Count only elements that clearly belong to the audited brand (not competitor branding).
- Count what is physically visible in THIS photo only — do not assume elements exist off-frame.
- If an element type does not appear at all, report a count of 0 for it.
- Do not do any scoring or point math yourself — only report raw counts, one short reasoning note per element you counted 1+ for, and an overall one-sentence summary.
- If the photo is too blurry, too dark, or too far away to judge an element reliably, still give your best count but reflect that in the overall confidence level.

Call the ${REPORT_TOOL_NAME} tool exactly once with your findings.`;
}

export async function detectVisibilityElements(params: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}): Promise<AiDetectionResult> {
  const countProperties = Object.fromEntries(
    ELEMENT_KEYS.map((key) => [
      key,
      {
        type: "integer",
        minimum: 0,
        description: `Number of "${VISIBILITY_MATRIX[key].label}" instances visible in the photo.`,
      },
    ]),
  );

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: buildSystemPrompt(),
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
            text: "Inspect this reseller shop photo and report the visibility element counts.",
          },
        ],
      },
    ],
    tools: [
      {
        name: REPORT_TOOL_NAME,
        description: "Report counted visibility elements for the audited photo.",
        input_schema: {
          type: "object",
          properties: {
            counts: {
              type: "object",
              properties: countProperties,
              required: [...ELEMENT_KEYS],
              additionalProperties: false,
            },
            reasoning: {
              type: "object",
              description: "One short note per element key that was counted 1 or higher.",
              additionalProperties: { type: "string" },
            },
            overall_summary: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["counts", "overall_summary", "confidence"],
        },
      },
    ],
    tool_choice: { type: "tool", name: REPORT_TOOL_NAME },
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("AI response did not include a tool call with visibility counts.");
  }

  const input = toolUse.input as {
    counts: Record<string, number>;
    reasoning?: Record<string, string>;
    overall_summary: string;
    confidence: "low" | "medium" | "high";
  };

  const counts = ELEMENT_KEYS.reduce((acc, key) => {
    acc[key] = Math.max(0, Math.round(input.counts?.[key] ?? 0));
    return acc;
  }, {} as ElementCounts);

  return {
    counts,
    reasoning: input.reasoning ?? {},
    overallSummary: input.overall_summary,
    confidence: input.confidence,
  };
}

import Anthropic from "@anthropic-ai/sdk";
import { MANIM_SYSTEM_PROMPT, RETRY_PROMPT } from "./prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GenerationResult {
  manimCode: string;
  explanation: string;
}

function parseResponse(text: string): GenerationResult {
  // Try to parse the response as JSON, handling potential markdown fences
  let cleaned = text.trim();

  // Remove markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  if (!parsed.manim_code || !parsed.explanation) {
    throw new Error("Response missing required fields: manim_code, explanation");
  }

  return {
    manimCode: parsed.manim_code,
    explanation: parsed.explanation,
  };
}

export async function generateVisualization(
  userPrompt: string,
  model: "claude-sonnet-4-20250514" | "claude-opus-4-0-20250514" = "claude-sonnet-4-20250514"
): Promise<GenerationResult> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: MANIM_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Create a Manim animation explaining: ${userPrompt}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  return parseResponse(content.text);
}

export async function retryWithError(
  originalCode: string,
  error: string,
  originalPrompt: string,
  model: "claude-sonnet-4-20250514" | "claude-opus-4-0-20250514" = "claude-sonnet-4-20250514"
): Promise<GenerationResult> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: MANIM_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Create a Manim animation explaining: ${originalPrompt}`,
      },
      {
        role: "assistant",
        content: `{"manim_code": ${JSON.stringify(originalCode)}, "explanation": "..."}`,
      },
      {
        role: "user",
        content: RETRY_PROMPT(originalCode, error),
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  return parseResponse(content.text);
}

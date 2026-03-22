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
  let cleaned = text.trim();

  // Remove markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  // Extract the first JSON object — Claude sometimes appends extra text
  const start = cleaned.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in response");
  }

  // Find the matching closing brace by counting braces
  let depth = 0;
  let end = -1;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error("Could not find complete JSON object in response");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1));

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
    max_tokens: 16384,
    system: MANIM_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Create a Manim animation explaining: ${userPrompt}`,
      },
    ],
  });

  if (response.stop_reason === "max_tokens") {
    throw new Error("Response was too long and got cut off. Try a simpler prompt.");
  }

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
    max_tokens: 16384,
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

  if (response.stop_reason === "max_tokens") {
    throw new Error("Response was too long and got cut off. Try a simpler prompt.");
  }

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  return parseResponse(content.text);
}

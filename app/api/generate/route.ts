import { NextRequest, NextResponse } from "next/server";
import { generateVisualization, retryWithError } from "@/lib/claude";
import { renderManimCode } from "@/lib/renderer";

export const maxDuration = 120;

interface GenerateRequest {
  prompt: string;
  model?: "claude-sonnet-4-20250514" | "claude-opus-4-0-20250514";
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    if (!body.prompt || body.prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const model = body.model || "claude-sonnet-4-20250514";

    // Phase 1: Generate code + explanation via Claude
    let generation = await generateVisualization(body.prompt, model);

    // Phase 2: Render the Manim code
    let renderResult = await renderManimCode(generation.manimCode);

    // Retry loop: if rendering fails, send error back to Claude for a fix
    const MAX_RETRIES = 2;
    let retryCount = 0;

    while (!renderResult.success && retryCount < MAX_RETRIES) {
      retryCount++;

      try {
        generation = await retryWithError(
          generation.manimCode,
          renderResult.error || "Unknown rendering error",
          body.prompt,
          model
        );
        renderResult = await renderManimCode(generation.manimCode);
      } catch {
        // If the retry itself fails, break and show what we have
        break;
      }
    }

    return NextResponse.json({
      success: renderResult.success,
      videoBase64: renderResult.videoBase64 || null,
      videoUrl: renderResult.videoUrl || null,
      explanation: generation.explanation,
      manimCode: generation.manimCode,
      renderError: renderResult.success ? null : renderResult.error,
      retries: retryCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

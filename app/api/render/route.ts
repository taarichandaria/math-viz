import { NextRequest, NextResponse } from "next/server";
import { renderManimCode } from "@/lib/renderer";
import { retryWithError } from "@/lib/claude";

export const maxDuration = 300;

const MAX_RETRIES = 2;

interface RenderRequest {
  manimCode: string;
  prompt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RenderRequest = await req.json();

    if (!body.manimCode) {
      return NextResponse.json(
        { error: "manimCode is required" },
        { status: 400 }
      );
    }

    let currentCode = body.manimCode;
    let retries = 0;
    let lastError: string | null = null;
    let explanation: string | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const renderResult = await renderManimCode(currentCode);

      if (renderResult.success) {
        return NextResponse.json({
          success: true,
          videoBase64: renderResult.videoBase64 || null,
          videoUrl: renderResult.videoUrl || null,
          renderError: null,
          manimCode: currentCode,
          explanation,
          retries,
        });
      }

      lastError = renderResult.error || "Unknown render error";

      // Don't retry on timeout — the animation is likely too complex
      if (lastError.includes("timed out")) {
        break;
      }

      // Don't retry if we've exhausted attempts or have no prompt for context
      if (attempt >= MAX_RETRIES || !body.prompt) {
        break;
      }

      // Ask Claude to fix the code
      try {
        const fixed = await retryWithError(
          currentCode,
          lastError,
          body.prompt
        );
        currentCode = fixed.manimCode;
        explanation = fixed.explanation;
        retries++;
      } catch {
        // If Claude fails to fix it, return the original render error
        break;
      }
    }

    return NextResponse.json({
      success: false,
      videoBase64: null,
      videoUrl: null,
      renderError: lastError,
      manimCode: currentCode,
      explanation,
      retries,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

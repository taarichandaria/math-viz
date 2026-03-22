import { NextRequest, NextResponse } from "next/server";
import { renderManimCode } from "@/lib/renderer";
import { retryWithError } from "@/lib/claude";

export const maxDuration = 60;

interface RenderRequest {
  manimCode: string;
  prompt?: string;
  model?: "claude-sonnet-4-20250514" | "claude-opus-4-0-20250514";
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

    let renderResult = await renderManimCode(body.manimCode);

    // If rendering fails and we have the original prompt, try one retry via Claude
    if (!renderResult.success && body.prompt && process.env.ANTHROPIC_API_KEY) {
      try {
        const model = body.model || "claude-sonnet-4-20250514";
        const fixed = await retryWithError(
          body.manimCode,
          renderResult.error || "Unknown rendering error",
          body.prompt,
          model
        );
        renderResult = await renderManimCode(fixed.manimCode);

        return NextResponse.json({
          success: renderResult.success,
          videoBase64: renderResult.videoBase64 || null,
          videoUrl: renderResult.videoUrl || null,
          manimCode: fixed.manimCode,
          explanation: fixed.explanation,
          renderError: renderResult.success ? null : renderResult.error,
          retried: true,
        });
      } catch {
        // Retry failed, return original error
      }
    }

    return NextResponse.json({
      success: renderResult.success,
      videoBase64: renderResult.videoBase64 || null,
      videoUrl: renderResult.videoUrl || null,
      renderError: renderResult.success ? null : renderResult.error,
      retried: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

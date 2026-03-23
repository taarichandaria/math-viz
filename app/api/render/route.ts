import { NextRequest, NextResponse } from "next/server";
import { renderManimCode } from "@/lib/renderer";
import { retryWithError } from "@/lib/claude";
import { validateManimCode } from "@/lib/validate";

export const maxDuration = 300;

const MAX_RETRIES = 2;

interface RenderRequest {
  manimCode: string;
  prompt?: string;
}

async function tryFixCode(
  code: string,
  error: string,
  prompt: string | undefined
): Promise<{ code: string; explanation: string | null } | null> {
  if (!prompt) return null;
  try {
    const fixed = await retryWithError(code, error, prompt);
    return { code: fixed.manimCode, explanation: fixed.explanation };
  } catch {
    return null;
  }
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
      // Pre-render validation — catch obvious issues without burning a render cycle
      const validation = validateManimCode(currentCode);
      if (!validation.valid) {
        lastError = "Code validation failed:\n" + validation.errors.join("\n");

        if (attempt >= MAX_RETRIES) break;

        const fixed = await tryFixCode(currentCode, lastError, body.prompt);
        if (!fixed) break;
        currentCode = fixed.code;
        explanation = fixed.explanation;
        retries++;
        continue;
      }

      // Render
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

      // Don't retry if we've exhausted attempts
      if (attempt >= MAX_RETRIES) break;

      // Ask Claude to fix the code
      const fixed = await tryFixCode(currentCode, lastError, body.prompt);
      if (!fixed) break;
      currentCode = fixed.code;
      explanation = fixed.explanation;
      retries++;
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

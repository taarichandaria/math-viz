import { NextRequest, NextResponse } from "next/server";
import { generateVisualization } from "@/lib/claude";
import { isAuthConfigured } from "@/lib/runtime-config";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

interface GenerateRequest {
  prompt: string;
  model?: "claude-sonnet-4-20250514" | "claude-opus-4-0-20250514";
}

export async function POST(req: NextRequest) {
  try {
    if (isAuthConfigured) {
      await auth();
    }

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

    const generation = await generateVisualization(body.prompt, model);

    return NextResponse.json({
      explanation: generation.explanation,
      manimCode: generation.manimCode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { renderManimCode } from "@/lib/renderer";

export const maxDuration = 60;

interface RenderRequest {
  manimCode: string;
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

    const renderResult = await renderManimCode(body.manimCode);

    return NextResponse.json({
      success: renderResult.success,
      videoBase64: renderResult.videoBase64 || null,
      videoUrl: renderResult.videoUrl || null,
      renderError: renderResult.success ? null : renderResult.error,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

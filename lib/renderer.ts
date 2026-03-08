const RENDERER_URL = process.env.RENDERER_URL || "http://localhost:8000";
const RENDERER_API_KEY = process.env.RENDERER_API_KEY || "";

export interface RenderResult {
  success: boolean;
  videoUrl?: string;
  videoBase64?: string;
  error?: string;
}

export async function renderManimCode(code: string): Promise<RenderResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (RENDERER_API_KEY) {
    headers["Authorization"] = `Bearer ${RENDERER_API_KEY}`;
  }

  const response = await fetch(`${RENDERER_URL}/render`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(120_000), // 2 minute timeout
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      success: false,
      error: `Renderer returned ${response.status}: ${errorBody}`,
    };
  }

  const data = await response.json();

  if (data.error) {
    return { success: false, error: data.error };
  }

  return {
    success: true,
    videoUrl: data.video_url,
    videoBase64: data.video_base64,
  };
}

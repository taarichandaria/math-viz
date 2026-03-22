const RENDERER_URL = process.env.RENDERER_URL || "http://localhost:8000";
const RENDERER_API_KEY = process.env.RENDERER_API_KEY || "";

// Modal endpoints have the function name in the URL already (e.g. ...render.modal.run)
// Docker/self-hosted endpoints need /render appended
const isModalUrl = RENDERER_URL.includes(".modal.run");
const RENDER_ENDPOINT = isModalUrl ? RENDERER_URL : `${RENDERER_URL}/render`;

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

  const response = await fetch(RENDER_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(50_000), // 50s timeout to fit within Vercel 60s limit
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

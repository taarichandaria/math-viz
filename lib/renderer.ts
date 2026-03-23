import { downloadVideoAsBase64, getRemoteVideoUrl } from "@/lib/video";

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

  let response: Response;
  try {
    response = await fetch(RENDER_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(110_000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return {
        success: false,
        error:
          "Rendering timed out after 110 seconds — simplifying the animation and retrying may help.",
      };
    }
    throw err;
  }

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

  const videoBase64 =
    typeof data.video_base64 === "string" && data.video_base64.trim()
      ? data.video_base64
      : undefined;
  const videoUrl = getRemoteVideoUrl(data.video_url) || undefined;

  if (videoBase64) {
    return {
      success: true,
      videoUrl,
      videoBase64,
    };
  }

  if (videoUrl) {
    try {
      const downloaded = await downloadVideoAsBase64(videoUrl);
      return {
        success: true,
        videoUrl,
        videoBase64: downloaded.base64,
      };
    } catch (error) {
      console.error("Failed to normalize renderer video URL", error);
      return {
        success: true,
        videoUrl,
      };
    }
  }

  return {
    success: false,
    error: "Renderer response did not include a usable video payload.",
  };
}

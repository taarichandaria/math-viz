const VIDEO_DOWNLOAD_TIMEOUT_MS = 30_000;
const VIDEO_DATA_URL_REGEX = /^data:(video\/[^;]+);base64,(.+)$/i;

export function getRemoteVideoUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

export async function downloadVideoAsBase64(
  url: string
): Promise<{ base64: string; contentType: string }> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "video/*,application/octet-stream;q=0.9,*/*;q=0.1",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(VIDEO_DOWNLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown download error";
    throw new Error(`Could not download rendered video: ${message}`);
  }

  if (!response.ok) {
    throw new Error(
      `Could not download rendered video: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error("Could not download rendered video: empty response body");
  }

  return {
    base64: Buffer.from(arrayBuffer).toString("base64"),
    contentType: response.headers.get("content-type") || "video/mp4",
  };
}

export function decodeVideoBase64(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

export function createDataVideoUrl(
  base64: string,
  contentType = "video/mp4"
): string {
  return `data:${contentType};base64,${base64}`;
}

export function getInlineVideoBase64(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(VIDEO_DATA_URL_REGEX);
  return match?.[2] || null;
}

export function getInlineVideoContentType(value: unknown): string {
  if (typeof value !== "string") {
    return "video/mp4";
  }

  const match = value.trim().match(VIDEO_DATA_URL_REGEX);
  return match?.[1] || "video/mp4";
}

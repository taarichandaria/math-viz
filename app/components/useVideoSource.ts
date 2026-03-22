"use client";

import { useEffect, useState } from "react";

function base64ToVideoBlob(base64: string) {
  const byteCharacters = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(byteCharacters.length));

  for (let i = 0; i < byteCharacters.length; i++) {
    bytes[i] = byteCharacters.charCodeAt(i);
  }

  return new Blob([bytes], { type: "video/mp4" });
}

export function useVideoSource(
  videoBase64: string | null,
  videoUrl: string | null
) {
  const [src, setSrc] = useState(videoUrl || "");

  useEffect(() => {
    if (!videoBase64) {
      setSrc(videoUrl || "");
      return;
    }

    let objectUrl: string | null = null;

    try {
      objectUrl = URL.createObjectURL(base64ToVideoBlob(videoBase64));
      setSrc(objectUrl);
    } catch {
      setSrc(videoUrl || `data:video/mp4;base64,${videoBase64}`);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [videoBase64, videoUrl]);

  return src;
}

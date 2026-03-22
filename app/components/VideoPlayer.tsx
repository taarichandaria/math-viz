"use client";

import { useRef, useState } from "react";
import { useVideoSource } from "./useVideoSource";

interface VideoPlayerProps {
  videoBase64: string | null;
  videoUrl: string | null;
}

export default function VideoPlayer({
  videoBase64,
  videoUrl,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const src = useVideoSource(videoBase64, videoUrl);

  if (!src) return null;

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = "mathviz-animation.mp4";
    link.click();
  };

  return (
    <div className="bg-black rounded-xl overflow-hidden shadow-lg">
      <video
        key={src}
        ref={videoRef}
        src={src}
        controls
        autoPlay
        className="w-full aspect-video"
        playsInline
        preload="metadata"
      />
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-2">Speed:</span>
          {[0.5, 1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                playbackRate === rate
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-3 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}

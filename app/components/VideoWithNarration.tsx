"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useVideoSource } from "./useVideoSource";

interface NarrationSegment {
  time: number; // seconds
  text: string;
}

interface VideoWithNarrationProps {
  videoBase64: string | null;
  videoUrl: string | null;
  explanation: string;
}

function parseNarration(explanation: string): NarrationSegment[] {
  const lines = explanation.split("\n").filter((l) => l.trim());
  const segments: NarrationSegment[] = [];

  for (const line of lines) {
    const match = line.match(/^\[(\d+):(\d{2})\]\s*(.+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      segments.push({
        time: minutes * 60 + seconds,
        text: match[3].trim(),
      });
    }
  }

  // If no timestamps found, treat the whole explanation as a single segment
  if (segments.length === 0 && explanation.trim()) {
    segments.push({ time: 0, text: explanation.trim() });
  }

  return segments;
}

export default function VideoWithNarration({
  videoBase64,
  videoUrl,
  explanation,
}: VideoWithNarrationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const narrationRef = useRef<HTMLDivElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const allSegments = parseNarration(explanation);
  // Once we know the actual video duration, filter out any narration segments
  // whose timestamps exceed the video length (Claude can't know the exact
  // duration when generating, so it sometimes writes narration beyond the end).
  const segments =
    videoDuration != null
      ? allSegments.filter((s) => s.time <= videoDuration)
      : allSegments;

  const src = useVideoSource(videoBase64, videoUrl);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;

    // Find the last segment whose time is <= currentTime
    let idx = 0;
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].time <= currentTime) {
        idx = i;
        break;
      }
    }
    setActiveIndex(idx);
  }, [segments]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [handleTimeUpdate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleLoadedMetadata = () => setVideoDuration(video.duration);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    // In case the video is already loaded when this effect runs
    if (video.readyState >= 1) setVideoDuration(video.duration);
    return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [src]);

  useEffect(() => {
    setActiveIndex(0);
    setVideoDuration(null);
  }, [src, explanation]);

  // Auto-scroll narration to active segment
  useEffect(() => {
    const container = narrationRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`[data-index="${activeIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex]);

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleSeekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleDownload = () => {
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = "mathviz-animation.mp4";
    link.click();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!src) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)]">
      {/* Video — takes up most of the space */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="bg-black rounded-xl overflow-hidden shadow-lg flex-1 flex flex-col">
          <video
            key={src}
            ref={videoRef}
            src={src}
            controls
            autoPlay
            className="w-full flex-1 object-contain bg-black"
            playsInline
            preload="metadata"
          />
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900 shrink-0">
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
      </div>

      {/* Narration panel */}
      <div className="lg:w-80 xl:w-96 shrink-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
            Narration
          </h3>
        </div>
        <div ref={narrationRef} className="flex-1 overflow-y-auto p-3 space-y-1">
          {segments.map((segment, i) => (
            <button
              key={i}
              data-index={i}
              onClick={() => handleSeekTo(segment.time)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 ${
                i === activeIndex
                  ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-750 border border-transparent"
              }`}
            >
              <span
                className={`text-xs font-mono ${
                  i === activeIndex
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {formatTime(segment.time)}
              </span>
              <p
                className={`text-sm mt-0.5 leading-relaxed ${
                  i === activeIndex
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {segment.text}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

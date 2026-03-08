"use client";

import { useState, useCallback, useEffect } from "react";
import InputPanel from "./components/InputPanel";
import VideoPlayer from "./components/VideoPlayer";
import Explanation from "./components/Explanation";
import CodeViewer from "./components/CodeViewer";
import LoadingState from "./components/LoadingState";
import History, {
  addToHistory,
  type HistoryEntry,
} from "./components/History";

interface GenerationResult {
  success: boolean;
  videoBase64: string | null;
  videoUrl: string | null;
  explanation: string;
  manimCode: string;
  renderError: string | null;
  retries: number;
}

type Phase = "idle" | "generating" | "rendering" | "retrying" | "done" | "error";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleGenerate = useCallback(async (prompt: string) => {
    setPhase("generating");
    setResult(null);
    setError(null);
    setRetryCount(0);

    try {
      // We can't track server-side phases from the client in a single POST,
      // so we simulate the phase transition with a timer
      const phaseTimer = setTimeout(() => setPhase("rendering"), 5000);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      clearTimeout(phaseTimer);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data: GenerationResult = await response.json();

      if (data.retries > 0) {
        setRetryCount(data.retries);
      }

      setResult(data);
      setPhase("done");

      // Add to history
      addToHistory({
        prompt,
        explanation: data.explanation,
        manimCode: data.manimCode,
        videoBase64: data.videoBase64,
        videoUrl: data.videoUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  }, []);

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    setResult({
      success: true,
      videoBase64: entry.videoBase64,
      videoUrl: entry.videoUrl,
      explanation: entry.explanation,
      manimCode: entry.manimCode,
      renderError: null,
      retries: 0,
    });
    setPhase("done");
    setError(null);
  }, []);

  const isLoading = phase === "generating" || phase === "rendering" || phase === "retrying";

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <History
        onSelect={handleHistorySelect}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen(!historyOpen)}
      />

      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                MathViz
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Describe a math concept, get an animation + explanation
              </p>
            </div>
            <DarkModeToggle />
          </header>

          {/* Input */}
          <InputPanel onGenerate={handleGenerate} isLoading={isLoading} />

          {/* Loading */}
          {isLoading && (
            <div className="mt-8">
              <LoadingState
                phase={phase as "generating" | "rendering" | "retrying"}
                retryCount={retryCount}
              />
            </div>
          )}

          {/* Error */}
          {phase === "error" && error && (
            <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Generation failed
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {phase === "done" && result && (
            <div className="mt-8 space-y-6">
              {/* Render error warning (but still show explanation) */}
              {result.renderError && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Animation couldn&apos;t be rendered
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                        The explanation is available below. You can also view and modify the source code.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video + Explanation side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(result.videoBase64 || result.videoUrl) && (
                  <VideoPlayer
                    videoBase64={result.videoBase64}
                    videoUrl={result.videoUrl}
                  />
                )}
                <Explanation content={result.explanation} />
              </div>

              {/* Code viewer */}
              <CodeViewer code={result.manimCode} />

              {/* Retry info */}
              {result.retries > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  Code was auto-corrected after {result.retries}{" "}
                  {result.retries === 1 ? "retry" : "retries"}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DarkModeToggle() {
  const [isDark, setIsDark] = useState(true); // default matches html class="dark"

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mathviz_theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}

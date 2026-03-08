"use client";

interface LoadingStateProps {
  phase: "generating" | "rendering" | "retrying";
  retryCount?: number;
}

export default function LoadingState({ phase, retryCount = 0 }: LoadingStateProps) {
  const phases = [
    {
      key: "generating",
      label: "Generating animation code...",
      description: "Claude is writing the Manim script and explanation",
    },
    {
      key: "rendering",
      label: "Rendering animation...",
      description: "Manim is executing the script and producing the video",
    },
    {
      key: "retrying",
      label: `Fixing and retrying (attempt ${retryCount})...`,
      description: "The code had an error — Claude is fixing it",
    },
  ];

  const currentPhaseIndex = phases.findIndex((p) => p.key === phase);

  return (
    <div className="w-full max-w-lg mx-auto py-12">
      <div className="flex flex-col items-center gap-6">
        {/* Animated visualization */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          <div className="absolute inset-3 rounded-full border-4 border-transparent border-b-purple-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          <div className="absolute inset-6 rounded-full border-4 border-transparent border-t-green-500 animate-spin" style={{ animationDuration: "2s" }} />
        </div>

        {/* Phase indicators */}
        <div className="space-y-3 w-full">
          {phases.map((p, i) => {
            const isActive = p.key === phase;
            const isComplete = i < currentPhaseIndex;
            const isPending = i > currentPhaseIndex;

            if (p.key === "retrying" && retryCount === 0 && !isActive) return null;

            return (
              <div
                key={p.key}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : ""
                }`}
              >
                <div className="mt-0.5">
                  {isComplete ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isActive
                        ? "text-blue-700 dark:text-blue-300"
                        : isComplete
                          ? "text-green-700 dark:text-green-400"
                          : isPending
                            ? "text-gray-400 dark:text-gray-500"
                            : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {p.label}
                  </p>
                  {isActive && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {p.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          This usually takes 15-45 seconds
        </p>
      </div>
    </div>
  );
}

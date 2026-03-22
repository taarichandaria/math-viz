"use client";

import { useState } from "react";

const EXAMPLE_PROMPTS = [
  "Epsilon-delta definition of a limit for f(x)=x² at x=3",
  "How a 2x2 matrix transforms the unit square",
  "The Central Limit Theorem with dice rolls",
  "Sieve of Eratosthenes up to 100",
  "Phase portrait of a simple harmonic oscillator",
  "Why the rationals are dense in the reals",
];

interface InputPanelProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

export default function InputPanel({ onGenerate, isLoading }: InputPanelProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="flex gap-3 items-end">
          <div className="flex-1 min-w-0">
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              What do you want to visualize?
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "the epsilon-delta definition of a functional limit"'
              rows={2}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:cursor-not-allowed shrink-0 h-10"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                Generate
                <span className="text-base">&#9654;</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Example prompts */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Try:
        </span>
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => handleExampleClick(example)}
            disabled={isLoading}
            className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}

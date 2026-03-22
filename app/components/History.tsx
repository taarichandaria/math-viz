"use client";

import { useEffect, useState, useCallback } from "react";

export interface HistoryEntry {
  id: string;
  prompt: string;
  explanation: string;
  manimCode: string;
  videoUrl: string | null;
  createdAt: string;
}

interface HistoryProps {
  onSelect: (entry: HistoryEntry) => void;
  isOpen: boolean;
  onToggle: () => void;
  refreshKey: number;
}

export default function History({ onSelect, isOpen, onToggle, refreshKey }: HistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
      }
    } catch {
      // History fetch is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  const handleClear = async () => {
    await fetch("/api/history/clear", { method: "DELETE" });
    setEntries([]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        aria-label="Toggle history"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity"
          onClick={onToggle}
        />
      )}

      {/* Slide-over panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700/50 shadow-xl transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            History
          </h2>
          <div className="flex items-center gap-3">
            {entries.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onToggle}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="p-4 text-sm text-gray-400 dark:text-gray-500">
              No visualizations yet. Generate one to see it here.
            </p>
          ) : (
            <ul className="py-2">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    onClick={() => {
                      onSelect(entry);
                      onToggle();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border-b border-gray-100 dark:border-gray-700/50"
                  >
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                      {entry.prompt}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(entry.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

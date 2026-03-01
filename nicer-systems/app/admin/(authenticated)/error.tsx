"use client";

import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center px-6">
        <p className="text-5xl font-bold text-primary mb-4">Error</p>
        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted mb-8 max-w-md text-sm">
          {error.message || "An unexpected error occurred in the admin panel."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-primary text-background font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
          <Link
            href="/admin"
            className="px-5 py-2.5 rounded-lg border border-border text-sm hover:bg-surface-light transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

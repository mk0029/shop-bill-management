"use client";

import { useEffect } from "react";
import { logClientError, normalizeUnknownError } from "@/lib/client-error-logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const normalized = normalizeUnknownError(error);
    void logClientError({
      source: "next.global-error",
      message: normalized.message,
      stack: normalized.stack,
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-white">
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md rounded-lg border border-gray-800 bg-gray-900 p-6 text-center shadow-xl">
            <h1 className="text-xl font-semibold">We hit a temporary problem</h1>
            <p className="mt-3 text-sm text-gray-300">
              The app logged the error for review. You can retry now, and core features should keep working once the page reloads.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

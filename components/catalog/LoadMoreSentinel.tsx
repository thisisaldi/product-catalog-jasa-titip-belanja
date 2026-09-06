"use client";

import { useEffect, useRef } from "react";

/**
 * Auto-loads the next cursor page when scrolled into view (replaces the
 * manual "Load More" button — client requirement change, 2026-09-06).
 * Disconnects while `loading` to avoid duplicate fetches on rapid scroll.
 */
export function LoadMoreSentinel({
  onVisible,
  loading,
}: {
  onVisible: () => void;
  loading: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, onVisible]);

  return (
    <div ref={sentinelRef} className="mt-8 flex justify-center">
      {loading && (
        <span className="inline-flex items-center gap-2 text-sm text-text-secondary">
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"
            aria-hidden="true"
          />
          Memuat...
        </span>
      )}
    </div>
  );
}

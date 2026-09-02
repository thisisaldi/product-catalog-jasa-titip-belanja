"use client";

import { useEffect, useRef } from "react";
import { ChevronDownIcon } from "@/components/shared/icons";

/**
 * Shared, mutually-exclusive dropdown/popover. Replaces independent
 * `<details>` elements (which never coordinate with each other and have no
 * outside-click/Escape support) with one controlled open-id owned by the
 * parent — only one dropdown can ever be open at a time, and it closes on
 * outside click, Escape, or when another dropdown in the same group opens.
 */
export function FilterDropdown({
  id,
  label,
  activeCount,
  openId,
  onOpenChange,
  children,
}: {
  id: string;
  label: string;
  activeCount: number;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const isOpen = openId === id;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onOpenChange(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => onOpenChange(isOpen ? null : id)}
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
          activeCount > 0
            ? "border-accent bg-accent-soft text-accent"
            : "border-border text-text-primary hover:border-accent/50"
        }`}
      >
        {label}
        {activeCount > 0 ? ` (${activeCount})` : ""}
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 z-20 mt-2 w-60 rounded-lg border border-border bg-surface p-3 shadow-card">
          {children}
        </div>
      )}
    </div>
  );
}

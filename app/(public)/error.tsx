"use client";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="text-base font-medium text-text-primary">Terjadi kesalahan.</p>
      <p className="text-sm text-text-secondary">Silakan coba lagi sebentar lagi.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg border border-border px-6 py-2.5 text-sm font-medium hover:border-accent hover:text-accent"
      >
        Coba Lagi
      </button>
    </div>
  );
}

"use client";

import { Container } from "@/components/shared/Container";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="flex flex-col items-center gap-3 py-24 text-center">
      <p className="text-lg font-semibold text-text-primary">Terjadi kesalahan.</p>
      <p className="text-sm text-text-secondary">Silakan coba lagi sebentar lagi.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 h-11 rounded-full bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Coba Lagi
      </button>
    </Container>
  );
}

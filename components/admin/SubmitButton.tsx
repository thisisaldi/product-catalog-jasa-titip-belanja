"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText = "Menyimpan...",
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}

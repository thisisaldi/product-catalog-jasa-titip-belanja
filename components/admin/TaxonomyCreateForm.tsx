"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionResult } from "@/lib/admin/actions/taxonomy";

export function TaxonomyCreateForm({
  action,
  placeholder,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  placeholder: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex items-start gap-2">
      <div className="flex-1">
        <label htmlFor="new-name" className="sr-only">
          {placeholder}
        </label>
        <input
          id="new-name"
          name="name"
          placeholder={placeholder}
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {state.error && <p className="mt-1 text-sm text-sold-out">{state.error}</p>}
      </div>
      <SubmitButton pendingText="Menambahkan...">Tambah</SubmitButton>
    </form>
  );
}

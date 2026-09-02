"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import { StatusBadge } from "./StatusBadge";
import type { ActionResult } from "@/lib/admin/actions/taxonomy";
import type { AdminTaxonomy } from "@/lib/admin/types";

export function TaxonomyEditRow({
  entry,
  onUpdate,
  onArchive,
  onRestore,
}: {
  entry: AdminTaxonomy;
  onUpdate: (id: string, prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  onArchive: (id: string) => Promise<ActionResult>;
  onRestore: (id: string) => Promise<ActionResult>;
}) {
  const updateAction = onUpdate.bind(null, entry.id);
  const [state, formAction] = useActionState(updateAction, {});

  return (
    <tr className="border-b border-border align-top">
      <td className="py-3 pr-4">
        <form action={formAction} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              name="name"
              defaultValue={entry.name}
              required
              className="w-56 rounded-md border border-border px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <SubmitButton pendingText="..." className="!px-3 !py-1.5 text-xs">
              Simpan
            </SubmitButton>
          </div>
          {state.error && <p className="text-xs text-sold-out">{state.error}</p>}
        </form>
      </td>
      <td className="py-3 pr-4 text-sm text-text-secondary">{entry.slug}</td>
      <td className="py-3 pr-4">
        <StatusBadge status={entry.status} />
      </td>
      <td className="py-3">
        {entry.status === "ACTIVE" ? (
          <form
            action={async () => {
              await onArchive(entry.id);
            }}
          >
            <button type="submit" className="text-sm text-text-secondary underline-offset-2 hover:underline">
              Arsipkan
            </button>
          </form>
        ) : (
          <form
            action={async () => {
              await onRestore(entry.id);
            }}
          >
            <button type="submit" className="text-sm text-accent underline-offset-2 hover:underline">
              Aktifkan
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}

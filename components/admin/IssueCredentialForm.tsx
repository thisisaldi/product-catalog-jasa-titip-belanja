"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import { issueCredential } from "@/lib/admin/actions/credentials";

export function IssueCredentialForm() {
  const [state, formAction] = useActionState(issueCredential, {});

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="label" className="mb-1 block text-sm font-medium">
              Label perangkat
            </label>
            <input
              id="label"
              name="label"
              placeholder='mis. "HP Pemilik"'
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <SubmitButton pendingText="Membuat...">Buat Kredensial</SubmitButton>
        </div>
        <div>
          <label htmlFor="expiresInDays" className="mb-1 block text-sm font-medium">
            Masa berlaku (hari)
          </label>
          <input
            id="expiresInDays"
            name="expiresInDays"
            type="number"
            min={1}
            placeholder="Kosongkan untuk permanen (tanpa batas waktu)"
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </form>
      {state.error && <p className="mt-2 text-sm text-sold-out">{state.error}</p>}
      {state.secret && (
        <div className="mt-3 rounded-lg border border-accent bg-accent-soft p-3 text-sm">
          <p className="font-medium">Tautan bootstrap (tampil sekali, salin sekarang):</p>
          <code className="mt-1 block break-all text-xs">/x7k9m2/access/{state.secret}</code>
          <p className="mt-1 text-xs text-text-secondary">
            Tempel di belakang domain toko, mis. https://namatoko.com/x7k9m2/access/{state.secret}
          </p>
        </div>
      )}
    </div>
  );
}

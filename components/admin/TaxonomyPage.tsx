import { TaxonomyCreateForm } from "./TaxonomyCreateForm";
import { TaxonomyEditRow } from "./TaxonomyEditRow";
import type { ActionResult } from "@/lib/admin/actions/taxonomy";
import type { AdminTaxonomy } from "@/lib/admin/types";

type Actions = {
  create: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  update: (id: string, prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  archive: (id: string) => Promise<ActionResult>;
  restore: (id: string) => Promise<ActionResult>;
};

export function TaxonomyPage({
  title,
  namePlaceholder,
  entries,
  actions,
}: {
  title: string;
  namePlaceholder: string;
  entries: AdminTaxonomy[];
  actions: Actions;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="mt-4 max-w-md">
        <TaxonomyCreateForm action={actions.create} placeholder={namePlaceholder} />
      </div>

      <div className="mt-6 overflow-x-auto">
        {entries.length === 0 ? (
          <p className="text-sm text-text-secondary">Belum ada data.</p>
        ) : (
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-secondary">
                <th className="py-2 pr-4">Nama</th>
                <th className="py-2 pr-4">Slug</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <TaxonomyEditRow
                  key={entry.id}
                  entry={entry}
                  onUpdate={actions.update}
                  onArchive={actions.archive}
                  onRestore={actions.restore}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

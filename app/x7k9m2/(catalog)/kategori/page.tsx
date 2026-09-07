import { TaxonomyPage } from "@/components/admin/TaxonomyPage";
import { listCategories } from "@/lib/admin/queries";
import {
  archiveCategory,
  createCategory,
  restoreCategory,
  updateCategory,
} from "@/lib/admin/actions/taxonomy";

export default async function CategoriesPage() {
  const categories = await listCategories();
  return (
    <TaxonomyPage
      namePlaceholder="Nama kategori baru"
      entries={categories}
      actions={{
        create: createCategory,
        update: updateCategory,
        archive: archiveCategory,
        restore: restoreCategory,
      }}
    />
  );
}

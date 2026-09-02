import { TaxonomyPage } from "@/components/admin/TaxonomyPage";
import { listBrands } from "@/lib/admin/queries";
import { archiveBrand, createBrand, restoreBrand, updateBrand } from "@/lib/admin/actions/taxonomy";

export default async function BrandsPage() {
  const brands = await listBrands();
  return (
    <TaxonomyPage
      title="Merek"
      namePlaceholder="Nama merek baru"
      entries={brands}
      actions={{ create: createBrand, update: updateBrand, archive: archiveBrand, restore: restoreBrand }}
    />
  );
}

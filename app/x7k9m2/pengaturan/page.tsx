import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/admin/queries";

export default async function SettingsPage() {
  const settings = await getSettings();
  if (!settings) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Pengaturan</h1>
        <p className="mt-2 text-sm text-sold-out">
          Baris pengaturan tidak ditemukan di database — hubungi pengembang.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Pengaturan</h1>
      <div className="mt-6">
        <SettingsForm initial={settings} />
      </div>
    </div>
  );
}

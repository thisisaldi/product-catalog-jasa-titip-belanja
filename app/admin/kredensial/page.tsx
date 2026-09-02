import { IssueCredentialForm } from "@/components/admin/IssueCredentialForm";
import { listCredentials, revokeCredential } from "@/lib/admin/actions/credentials";

export default async function CredentialsPage() {
  const credentials = await listCredentials();

  return (
    <div>
      <h1 className="text-xl font-semibold">Kredensial Akses</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Tidak ada login — perangkat mengakses admin lewat tautan bootstrap sekali pakai.
      </p>

      <div className="mt-6 max-w-md">
        <IssueCredentialForm />
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-secondary">
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Dibuat</th>
              <th className="py-2 pr-4">Kedaluwarsa</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((c) => {
              const isRevoked = Boolean(c.revokedAt);
              const isExpired = c.isExpired;
              return (
                <tr key={c.id} className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">{c.label}</td>
                  <td className="py-2 pr-4 text-sm text-text-secondary">
                    {new Date(c.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="py-2 pr-4 text-sm text-text-secondary">
                    {new Date(c.expiresAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="py-2 pr-4 text-sm">
                    {isRevoked ? (
                      <span className="text-sold-out">Dicabut</span>
                    ) : isExpired ? (
                      <span className="text-sold-out">Kedaluwarsa</span>
                    ) : (
                      <span className="text-available">Aktif</span>
                    )}
                  </td>
                  <td className="py-2">
                    {!isRevoked && (
                      <form
                        action={async () => {
                          "use server";
                          await revokeCredential(c.id);
                        }}
                      >
                        <button type="submit" className="text-sm text-sold-out underline-offset-2 hover:underline">
                          Cabut
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

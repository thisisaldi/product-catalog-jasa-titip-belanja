export function StatusBadge({ status }: { status: "ACTIVE" | "INACTIVE" }) {
  const isActive = status === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-available/15 text-available" : "bg-sold-out/15 text-sold-out"
      }`}
    >
      {isActive ? "Aktif" : "Nonaktif"}
    </span>
  );
}

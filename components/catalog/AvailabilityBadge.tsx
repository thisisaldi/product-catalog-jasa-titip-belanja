export function AvailabilityBadge({
  available,
  size = "sm",
}: {
  available: boolean;
  size?: "sm" | "base";
}) {
  const label = available ? "Tersedia" : "Stok Habis";
  const colorClass = available ? "text-available" : "text-sold-out";
  const dotClass = available ? "bg-available" : "bg-sold-out";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${textSize} ${colorClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
      {label}
    </span>
  );
}

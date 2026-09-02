import { ImageIcon } from "./icons";

/**
 * Stand-in for real product photography (no photo assets exist yet in this
 * mock-data milestone). Deterministic per-product hue so the catalog still
 * reads as visually varied, not a flat repeated gray box.
 */
function hueFromSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

export function ProductImagePlaceholder({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const hue = hueFromSeed(seed);
  return (
    <div
      className={`flex items-center justify-center bg-border ${className ?? ""}`}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 35% 91%), hsl(${(hue + 35) % 360} 30% 82%))`,
      }}
    >
      <ImageIcon className="h-8 w-8 text-text-secondary/40" />
    </div>
  );
}

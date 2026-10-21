import { PackageIcon, SearchIcon } from "@/components/shared/icons";

type EmptyStateProps = {
  variant: "no-results" | "empty-category";
  onReset?: () => void;
};

const copy = {
  "no-results": {
    icon: SearchIcon,
    heading: "Tidak menemukan produk yang dicari.",
    body: "Coba kata kunci lain.",
  },
  "empty-category": {
    icon: PackageIcon,
    heading: "Belum ada produk di kategori ini.",
    body: "Coba kategori atau filter lain.",
  },
} as const;

export function EmptyState({ variant, onReset }: EmptyStateProps) {
  const { icon: Icon, heading, body } = copy[variant];
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center sm:py-24">
      <span className="mb-1 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
        <Icon className="h-8 w-8 text-text-secondary" />
      </span>
      <p className="text-base font-medium text-text-primary">{heading}</p>
      <p className="text-sm text-text-secondary">{body}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 h-10 rounded-full border border-border bg-surface px-5 text-sm font-medium text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Reset filter
        </button>
      )}
    </div>
  );
}

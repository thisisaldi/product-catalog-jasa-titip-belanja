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
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <Icon className="h-12 w-12 text-text-secondary" />
      <p className="text-base font-medium text-text-primary">{heading}</p>
      <p className="text-sm text-text-secondary">{body}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          Reset filter
        </button>
      )}
    </div>
  );
}

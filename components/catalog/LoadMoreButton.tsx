export function LoadMoreButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <div className="mt-8 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="w-full max-w-xs rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-primary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"
              aria-hidden="true"
            />
            Memuat...
          </span>
        ) : (
          "Muat Lebih Banyak"
        )}
      </button>
    </div>
  );
}

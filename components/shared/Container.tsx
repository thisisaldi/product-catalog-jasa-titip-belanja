/**
 * Single content-width/gutter definition for every public page — the fix
 * for "content glued to the viewport edges" feedback. Comfortable mobile
 * padding, a sensible desktop max-width, consistent everywhere it's used.
 */
export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10 xl:px-12 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Single content-width/gutter definition for every public page —
 * 03-design-specification.md Section 1.8: `--container-max: 1280px`
 * (`max-w-7xl`), padding 16px mobile / 24px tablet (`md:`, ≥768px) / 32px
 * desktop (`lg:`, ≥1024px). Fixed token values, not a free spacing choice.
 */
export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

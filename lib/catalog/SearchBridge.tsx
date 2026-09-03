"use client";

import { createContext, useContext, useEffect, useRef, type MutableRefObject } from "react";

/**
 * Bridges the header's global search box (rendered once in the public
 * layout, a SIBLING of the page content — not an ancestor/descendant of
 * CatalogView) to the catalog page's own client-side refetch state, without
 * going through router.push/replace.
 *
 * Why not the URL: a same-pathname, search-param-only client navigation
 * (`router.replace("/?q=...")` while already on `/`) triggers a "destination
 * stream closed early" failure in this pinned Next.js 16.3.4 canary build —
 * confirmed independent of this feature (the pre-existing Enter-to-submit
 * search had the identical bug when already on the catalog page). A full
 * page load to the same URL works fine, and so does a router.push to a
 * *different* pathname (e.g. from /keranjang to /?q=...) — only the
 * same-pathname client-side case is broken.
 *
 * Why a ref, not plain context state: Header and CatalogView are siblings
 * under the public layout, so the Provider has to live above both — it
 * can't be owned by CatalogView itself. A ref lets CatalogView register its
 * current refetch handler imperatively (via effect) without forcing the
 * Provider (and therefore Header) to re-render on every keystroke. Both
 * sides only ever touch `.current` outside render — CatalogView in an
 * effect, Header inside its change/submit event handlers.
 */
type SearchHandler = (q: string) => void;
const SearchBridgeContext = createContext<MutableRefObject<SearchHandler | null> | null>(null);

export function SearchBridgeProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<SearchHandler | null>(null);
  return <SearchBridgeContext.Provider value={ref}>{children}</SearchBridgeContext.Provider>;
}

/** CatalogView calls this to register its current refetch handler while mounted. */
export function useRegisterSearchHandler(handler: SearchHandler) {
  const ref = useContext(SearchBridgeContext);
  useEffect(() => {
    if (!ref) return;
    ref.current = handler;
    return () => {
      if (ref.current === handler) ref.current = null;
    };
  }, [ref, handler]);
}

/**
 * Header calls this once per render to get the shared ref object; the
 * actual `.current` handler must only be read inside an event handler
 * (change/submit), never during render.
 */
export function useSearchBridgeRef() {
  return useContext(SearchBridgeContext);
}

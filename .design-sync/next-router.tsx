/*
 * design-sync: a stand-in for Next's app router, so components that call
 * useRouter / usePathname / useSearchParams render outside a Next app.
 *
 * Outside Next those hooks throw "invariant expected app router to be mounted".
 * This provides the same three contexts Next itself provides, from Next's own
 * modules (so next/navigation in the bundle reads exactly these), with a router
 * whose navigation methods do nothing. Shipped in the bundle via cfg.extraEntries
 * and wrapped around every preview via cfg.provider; designs that use a
 * router-reading component (BackLink, SectionNav, StatsFilters) wrap it too.
 * Nest a second one to set a different pathname for part of a page.
 */

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  PathParamsContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { type ReactNode, useMemo } from "react";

const noop = () => {};

const router: AppRouterInstance = {
  back: noop,
  forward: noop,
  refresh: noop,
  push: noop,
  replace: noop,
  prefetch: noop,
  // Constant: there is no back/forward cache to reset outside a Next app.
  bfcacheId: "design-system",
};

export function NextAppRouter({
  pathname = "/",
  search = "",
  children,
}: {
  /** The path usePathname() returns, e.g. "/statistiken/pokemon". */
  pathname?: string;
  /** The query useSearchParams() reads, e.g. "phase=regular". */
  search?: string;
  children?: ReactNode;
}) {
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  return (
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value={pathname}>
        <SearchParamsContext.Provider value={searchParams}>
          <PathParamsContext.Provider value={{}}>
            {children}
          </PathParamsContext.Provider>
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}

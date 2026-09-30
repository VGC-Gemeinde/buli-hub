import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { Tick } from "@/components/tick";

// The one anatomy of a staff page (docs/plans/staff-dashboard.md): site
// header with the staff navigation, then the 1040px column with the title (large
// tick, 30px heading), an optional action beside it, one intro line, and the
// content. The navigation is the way back, so there is no breadcrumb and no
// "← Staff-Bereich" link. Callers gate the role themselves before rendering.
export function StaffPage({
  title,
  intro,
  action,
  children,
}: {
  title: string;
  intro?: ReactNode;
  // One control beside the title, e.g. "Spieler bannen".
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader section="staff" />
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-6 pt-9 pb-14 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <Tick size="l" />
            <h1 className="text-[30px] text-brand-blue leading-tight dark:text-white">
              {title}
            </h1>
          </div>
          {action}
        </div>
        {intro ? (
          <div className="mt-2 max-w-[680px] text-muted-foreground text-sm leading-relaxed">
            {intro}
          </div>
        ) : null}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

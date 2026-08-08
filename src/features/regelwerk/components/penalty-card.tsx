import type { ReactNode } from "react";
import { QualifierPill } from "@/features/regelwerk/components/pull-outs";

// One Strafen situation (Teamsheet-Fehler, Disconnects, Ghosting, Bugs). The
// chapter's other sections are prose; these are four parallel cases, and cards
// make that parallel structure visible instead of burying it in one long list.
// `qualifier` carries "Champions" on the two that only apply there.
export function PenaltyCard({
  title,
  qualifier,
  children,
}: {
  title: string;
  qualifier?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold font-heading text-[15px] text-brand-blue uppercase tracking-[0.02em] dark:text-white">
          {title}
        </span>
        {qualifier ? <QualifierPill>{qualifier}</QualifierPill> : null}
      </div>
      {children}
    </div>
  );
}

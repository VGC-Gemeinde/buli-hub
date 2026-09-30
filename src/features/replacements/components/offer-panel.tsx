import type { ReactNode } from "react";
import { SectionHeader } from "@/components/section-header";
import { Tick } from "@/components/tick";
import { PlayerLink } from "@/features/player-profile/components/player-link";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import type { Identity } from "@/features/season/dashboard";
import { formatGermanDayRange } from "@/lib/german-time";

// What the Spieler-Dashboard shows someone staff offered a dropped player's
// slot (docs/plans/player-replacement.md): whose place it is, where, from
// when, and what the record starts with. The form below it (the registration
// questions) is `children`, so the membership block can take its place.
export function ReplacementOfferPanel({
  replaced,
  groupName,
  seasonName,
  entryRound,
  entryStartsOn,
  entryEndsOn,
  missed,
  children,
}: {
  replaced: Identity;
  groupName: string;
  seasonName: string;
  entryRound: number;
  entryStartsOn: string;
  entryEndsOn: string;
  missed: number;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-10">
      <div className="rounded-xl border px-6 py-7 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Tick size="m" />
          <h2 className="font-bold font-heading text-[22px] text-brand-blue uppercase leading-tight tracking-[0.02em] sm:text-[24px] dark:text-white">
            Ein Platz für dich
          </h2>
        </div>
        <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
          Der Staff bietet dir einen Platz in der {seasonName} an. Du übernimmst
          den Platz eines gedroppten Spielers mit seinem Spielplan und spielst
          ab deinem Einstieg ganz normal mit.
        </p>

        <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
          <Fact label="Platz von">
            <span className="flex min-w-0 items-center gap-2">
              <PlayerAvatar identity={replaced} size="size-[22px]" />
              <PlayerLink
                userId={replaced.userId}
                name={replaced.name}
                className="truncate"
              />
            </span>
          </Fact>
          <Fact label="Gruppe">{groupName}</Fact>
          <Fact label="Einstieg">
            <span className="flex flex-col">
              <span>Spieltag {entryRound}</span>
              <span className="font-normal text-[13px] text-muted-foreground">
                {formatGermanDayRange(entryStartsOn, entryEndsOn)}
              </span>
            </span>
          </Fact>
        </dl>

        <p className="mt-5 text-[14px] text-muted-foreground leading-relaxed">
          {missed === 0 ? (
            "Du startest ohne verpasste Spieltage in die Tabelle."
          ) : (
            <>
              Du startest mit{" "}
              <span className="font-semibold text-foreground">
                {missed === 1 ? "einer Niederlage" : `${missed} Niederlagen`}
              </span>
              : Die Spieltage vor deinem Einstieg zählen für den Platz als
              verloren, so wie für {replaced.name} auch.
            </>
          )}
        </p>
      </div>

      <section className="flex flex-col gap-6">
        <SectionHeader>Deine Angaben</SectionHeader>
        {children}
      </section>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-background px-4 py-3">
      <dt className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
        {label}
      </dt>
      <dd className="min-w-0 font-semibold text-[15px]">{children}</dd>
    </div>
  );
}

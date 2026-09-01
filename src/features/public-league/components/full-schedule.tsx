"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { Tick } from "@/components/tick";
import type { MatchdayLite } from "@/features/season/dashboard";
import { SpoilerSwitch } from "@/features/spoilers/components/spoiler-switch";
import type { PublicDivision, PublicOverview } from "../queries";
import { MatchdayList, Switcher, weekRange } from "./public-league";

// The complete Spielplan: every Spieltag with every pairing of the selected
// division, in the overview's anatomy (same pill switcher, same match rows,
// same spoiler behavior). Public and identical for every visitor; during
// schedule_hidden it is the staff preview of exactly what will go live
// (docs/plans/full-schedule-page.md).
export function FullSchedule({
  overview,
  meId,
  initialSpoilersOff,
  hiddenPreview,
}: {
  overview: PublicOverview;
  meId: string;
  initialSpoilersOff: boolean;
  hiddenPreview: boolean;
}) {
  const [tier, setTier] = useState(overview.divisions[0]?.tier ?? 1);
  const [spoilersOff, setSpoilersOff] = useState(initialSpoilersOff);
  const division =
    overview.divisions.find((d) => d.tier === tier) ?? overview.divisions[0];
  const matchdays = [...overview.matchdays].sort((a, b) => a.round - b.round);

  return (
    <div className="mx-auto w-full max-w-[1040px] flex-1 px-6 pt-10 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <Tick size="l" />
          <h1 className="text-[28px] text-brand-blue leading-[1.1] sm:text-[34px] dark:text-white">
            Spielplan
          </h1>
          <span className="whitespace-nowrap font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
            · {overview.seasonName}
          </span>
          {hiddenPreview ? (
            <span className="rounded-full border border-brand-orange/50 bg-brand-orange/10 px-2.5 py-0.5 font-semibold text-[11px] text-brand-orange uppercase tracking-[0.08em]">
              Intern · noch nicht veröffentlicht
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
          {overview.currentRound ? (
            <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
              Spieltag {overview.currentRound} / {overview.totalRounds}
            </span>
          ) : null}
          <SpoilerSwitch spoilersOff={spoilersOff} onChange={setSpoilersOff} />
        </div>
      </div>

      <div className="mt-6">
        <Switcher
          options={overview.divisions.map((d) => ({
            value: String(d.tier),
            label: d.name,
          }))}
          selected={String(tier)}
          onSelect={(value) => setTier(Number(value))}
        />
      </div>

      {division ? (
        <div className="mt-8 flex flex-col gap-10">
          {matchdays.map((matchday) => (
            <RoundSection
              key={matchday.round}
              division={division}
              matchday={matchday}
              isCurrent={matchday.round === overview.currentRound}
              meId={meId}
              spoilersOff={spoilersOff}
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-muted-foreground">
          Es liegt noch kein Spielplan vor.
        </p>
      )}
    </div>
  );
}

// One Spieltag of one division: the week range in the header, the groups that
// play side by side. Groups without a match that round are skipped; a round
// the whole division sits out says so in one line.
function RoundSection({
  division,
  matchday,
  isCurrent,
  meId,
  spoilersOff,
}: {
  division: PublicDivision;
  matchday: MatchdayLite;
  isCurrent: boolean;
  meId: string;
  spoilersOff: boolean;
}) {
  const groups = division.groups
    .map((group) => ({
      group,
      matches: group.matches.filter((m) => m.round === matchday.round),
    }))
    .filter((entry) => entry.matches.length > 0);

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        meta={
          <span className="flex items-center gap-2.5">
            <span className="tabular-nums">
              {weekRange(matchday.startsOn, matchday.endsOn)}
            </span>
            {isCurrent ? (
              <span className="rounded-full border border-brand-orange/50 bg-brand-orange/10 px-2 py-0.5 font-semibold text-[11px] text-brand-orange uppercase tracking-[0.08em]">
                Läuft
              </span>
            ) : null}
          </span>
        }
      >
        Spieltag {matchday.round}
      </SectionHeader>
      {groups.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          An diesem Spieltag hat {division.name} spielfrei.
        </p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-x-8 gap-y-5 lg:grid-cols-2">
          {groups.map(({ group, matches }) => (
            <div key={group.subDivisionId} className="flex flex-col gap-2">
              <p className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
                {group.name}
              </p>
              <MatchdayList
                matches={matches}
                meId={meId}
                spoilersOff={spoilersOff}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

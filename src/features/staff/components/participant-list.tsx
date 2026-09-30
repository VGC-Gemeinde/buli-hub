"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { FilterChip } from "@/components/filter-chip";
import { Input } from "@/components/ui/input";
import {
  DropActions,
  DropPlayerDialog,
} from "@/features/drops/components/drop-controls";
import { RefreshListButton } from "@/features/membership/components/refresh-list-button";
import { PlayerLink } from "@/features/player-profile/components/player-link";
import { CancelRegistrationDialog } from "@/features/registration/components/cancel-registration-dialog";
import type { ReplacementOfferOptions } from "@/features/replacements/components/offer-dialog";
import { ReplacementStatusLine } from "@/features/replacements/components/replacement-status";
import type { ReplacementRow } from "@/features/replacements/queries";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { formatGermanDateTime } from "@/lib/german-time";
import { cn } from "@/lib/utils";
import type { ParticipantRow } from "../participant-queries";
import {
  filterCounts,
  matchesFilter,
  type ParticipantFacts,
  type ParticipantFilter,
  participantTags,
} from "../participants";

export type StaffParticipantRow = ParticipantRow & {
  facts: ParticipantFacts;
  // The replacement for this player's dropped slot, offered or accepted.
  replacement: ReplacementRow | null;
};

const FILTER_LABELS: Record<ParticipantFilter, string> = {
  all: "Alle",
  not_on_server: "Nicht auf dem Server",
  unchecked: "Nicht geprüft",
  dropped: "Gedroppt",
};

// The Teilnehmer list (docs/plans/staff-dashboard.md): everyone in the
// season with their state as tags, filter chips with counts, a name search,
// and per row the one action that fits the phase. Before the seeding a
// registration can be cancelled; from the finalized seeding on a player is
// dropped, and a dropped one un-dropped or replaced.
export function StaffParticipantList({
  rows,
  actions,
  seasonName,
  offerOptions,
  missedByReplaced,
  checkedAt,
  initialFilter = "all",
}: {
  rows: StaffParticipantRow[];
  actions: "cancel" | "drop" | "none";
  seasonName: string;
  offerOptions: ReplacementOfferOptions | null;
  missedByReplaced: Record<string, Record<number, number>>;
  // The oldest confirmed membership check: everyone confirmed was checked at
  // least since then.
  checkedAt: Date | null;
  initialFilter?: ParticipantFilter;
}) {
  const [filter, setFilter] = useState<ParticipantFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const counts = useMemo(() => filterCounts(rows.map((r) => r.facts)), [rows]);
  const needle = query.trim().toLocaleLowerCase("de");
  const shown = rows.filter(
    (row) =>
      matchesFilter(row.facts, filter) &&
      (needle === "" ||
        row.identity.name.toLocaleLowerCase("de").includes(needle) ||
        (row.username ?? "").toLocaleLowerCase("de").includes(needle)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(FILTER_LABELS) as ParticipantFilter[]).map((key) =>
            key === "all" || counts[key] > 0 ? (
              <FilterChip
                key={key}
                active={filter === key}
                onClick={() => setFilter(key)}
              >
                {FILTER_LABELS[key]}{" "}
                <span className="tabular-nums opacity-80">{counts[key]}</span>
              </FilterChip>
            ) : null,
          )}
        </div>
        <div className="relative w-full sm:w-64">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Teilnehmer suchen"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name suchen"
            autoComplete="off"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/50 px-4 py-2 text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
          <span className="font-semibold">
            {shown.length === rows.length
              ? `${rows.length} Spieler`
              : `${shown.length} von ${rows.length}`}
          </span>
          <span className="flex items-center gap-1 font-semibold normal-case tracking-normal">
            {checkedAt
              ? `Mitgliedschaft geprüft: ${formatGermanDateTime(checkedAt, {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Mitgliedschaft noch nicht geprüft"}
            <RefreshListButton />
          </span>
        </div>
        {shown.length === 0 ? (
          <p className="px-4 py-6 text-center text-muted-foreground text-sm">
            {rows.length === 0
              ? "Noch niemand angemeldet."
              : "Niemand passt zu Filter und Suche."}
          </p>
        ) : (
          shown.map((row) => (
            <ParticipantRowView
              key={row.identity.userId}
              row={row}
              actions={actions}
              seasonName={seasonName}
              offerOptions={offerOptions}
              missedByRound={missedByReplaced[row.identity.userId]}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ParticipantRowView({
  row,
  actions,
  seasonName,
  offerOptions,
  missedByRound,
}: {
  row: StaffParticipantRow;
  actions: "cancel" | "drop" | "none";
  seasonName: string;
  offerOptions: ReplacementOfferOptions | null;
  missedByRound?: Record<number, number>;
}) {
  const tags = participantTags(row.facts);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b px-4 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4",
        row.dropped && "bg-muted/25",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PlayerAvatar identity={row.identity} size="size-[26px] shrink-0" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <PlayerLink
              userId={row.identity.userId}
              name={row.identity.name}
              className="truncate font-medium text-[14.5px]"
            />
            {row.groupName ? (
              <span className="shrink-0 rounded-full bg-muted px-[7px] py-[1px] font-bold text-[10.5px] text-muted-foreground">
                {row.groupName.replace("Division ", "")}
              </span>
            ) : null}
            {tags.map((tag) => (
              <span
                key={tag.label}
                title={tag.title}
                className={cn(
                  "shrink-0 rounded-full px-[7px] py-[1px] font-semibold text-[11px]",
                  tag.tone === "problem" &&
                    "bg-destructive/10 text-destructive",
                  tag.tone === "muted" && "border text-muted-foreground",
                  tag.tone === "neutral" &&
                    "border border-brand-blue/30 bg-brand-blue/6 text-brand-blue dark:border-white/30 dark:text-white",
                )}
              >
                {tag.label}
              </span>
            ))}
          </span>
          {row.dropped && row.dropReason ? (
            <span className="truncate text-[13px] text-muted-foreground">
              "{row.dropReason}"
            </span>
          ) : null}
          {row.replacement ? (
            <ReplacementStatusLine
              replacement={row.replacement.replacement}
              entryRound={row.replacement.entryRound}
              acceptedAt={row.replacement.acceptedAt}
              offeredAt={row.replacement.offeredAt}
            />
          ) : null}
        </div>
      </div>
      <RowAction
        row={row}
        actions={actions}
        seasonName={seasonName}
        offerOptions={offerOptions}
        missedByRound={missedByRound}
      />
    </div>
  );
}

function RowAction({
  row,
  actions,
  seasonName,
  offerOptions,
  missedByRound,
}: {
  row: StaffParticipantRow;
  actions: "cancel" | "drop" | "none";
  seasonName: string;
  offerOptions: ReplacementOfferOptions | null;
  missedByRound?: Record<number, number>;
}) {
  if (actions === "cancel") {
    return (
      <CancelRegistrationDialog
        seasonName={seasonName}
        player={{ userId: row.identity.userId, name: row.identity.name }}
        triggerSize="sm"
        quiet
      />
    );
  }
  if (actions !== "drop" || row.groupName === null) {
    return null;
  }
  if (row.dropped) {
    return (
      <DropActions
        drop={{ identity: row.identity, groupName: row.groupName }}
        replacement={row.replacement}
        offerOptions={offerOptions}
        missedByRound={missedByRound}
      />
    );
  }
  // Someone who took over a slot is a normal player: they can be dropped.
  return (
    <DropPlayerDialog
      fixed={{
        userId: row.identity.userId,
        name: row.identity.name,
        groupName: row.groupName,
      }}
      triggerSize="sm"
      quiet
    />
  );
}

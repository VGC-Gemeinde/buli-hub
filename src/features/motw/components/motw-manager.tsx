"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyStateCard } from "@/components/empty-state-card";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGermanDay } from "@/lib/german-time";
import { cn } from "@/lib/utils";
import { removeMotw, saveMotwYoutubeUrl, selectMotw } from "../actions";
import { MotwBadge } from "./motw-badge";

export type MotwWeekMatch = {
  matchId: string;
  groupName: string;
  playerAName: string;
  playerBName: string;
};

// One pickable Spieltag (the current or the next one) with its full match
// list and the current pick, if any.
export type MotwWeek = {
  round: number;
  current: boolean;
  startsOn: string;
  endsOn: string;
  matches: MotwWeekMatch[];
  selection: { matchId: string; youtubeUrl: string | null } | null;
};

// A pick of an earlier Spieltag: no longer changeable, but its VOD link is —
// uploads can lag the week.
export type MotwPastPick = {
  round: number;
  matchId: string;
  youtubeUrl: string | null;
  groupName: string;
  playerAName: string;
  playerBName: string;
};

function ddMM(dateStr: string): string {
  return formatGermanDay(dateStr, {
    day: "2-digit",
    month: "2-digit",
  });
}

function chipLabel(groupName: string): string {
  return groupName.replace("Division ", "Div. ");
}

function shortGroup(groupName: string): string {
  return groupName.replace("Division ", "Div ");
}

// Display form of a VOD link: no scheme/www, hard-cut with an ellipsis.
function shortUrl(url: string): string {
  const stripped = url.replace(/^https:\/\/(www\.)?/, "");
  return stripped.length > 24 ? `${stripped.slice(0, 24)}…` : stripped;
}

// The staff manager for the Match of the Week (design/MATCH-OF-THE-WEEK.md
// §5): pick/replace/remove for the current and next Spieltag, plus VOD links
// for every pick.
export function MotwManager({
  weeks,
  past,
}: {
  weeks: MotwWeek[];
  past: MotwPastPick[];
}) {
  return (
    <div className="flex flex-col gap-10">
      {weeks.length === 0 ? (
        <EmptyStateCard title="Kein laufender Spieltag" informational>
          Ein Match of the Week lässt sich nur für den aktuellen oder nächsten
          Spieltag wählen.
        </EmptyStateCard>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {weeks.map((week) => (
            <WeekCard key={week.round} week={week} />
          ))}
        </div>
      )}

      {past.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeader meta="VOD-Links nachträglich anhängen">
            Frühere Spieltage
          </SectionHeader>
          <div className="flex flex-col gap-2.5">
            {past.map((pick) => (
              <PastRow key={pick.round} pick={pick} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function WeekCard({ week }: { week: MotwWeek }) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = week.selection
    ? (week.matches.find((m) => m.matchId === week.selection?.matchId) ?? null)
    : null;
  const showList = picking || !week.selection;
  // Division filter chips, derived from the round's matches — with a dozen or
  // more groups the flat list is unusable without them.
  const groupNames = [...new Set(week.matches.map((m) => m.groupName))];
  const shownMatches = filter
    ? week.matches.filter((m) => m.groupName === filter)
    : week.matches;

  async function pick(matchId: string) {
    setPendingId(matchId);
    setError(null);
    const result = await selectMotw({ matchId });
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPicking(false);
    router.refresh();
  }

  async function remove() {
    setRemoving(true);
    setError(null);
    const result = await removeMotw({ round: week.round });
    setRemoving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPicking(false);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border px-5 py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-bold font-heading text-[21px] text-brand-blue uppercase leading-none dark:text-white">
          Spieltag {week.round}
        </h2>
        <span
          className={cn(
            "rounded-full border px-2.5 py-[3px] font-bold text-[11px] uppercase leading-none tracking-[0.06em]",
            week.current
              ? "border-brand-orange/50 bg-brand-orange/12 text-[#9a4b00] dark:text-brand-orange"
              : "bg-muted text-muted-foreground",
          )}
        >
          {week.current ? "Aktuelle Woche" : "Nächste Woche"}
        </span>
        <span className="ml-auto text-[13px] text-muted-foreground tabular-nums">
          {ddMM(week.startsOn)} – {ddMM(week.endsOn)}
        </span>
      </div>

      {week.selection ? (
        <div className="flex flex-col gap-2.5 rounded-[10px] border border-brand-orange/40 bg-brand-orange/5 px-4 py-3.5">
          <MotwBadge>Gewählt</MotwBadge>
          <Link
            href={`/match/${week.selection.matchId}`}
            className="font-semibold text-[15px] hover:text-brand-blue dark:hover:text-white"
          >
            {selected ? (
              <>
                {selected.playerAName}{" "}
                <span className="font-normal text-muted-foreground">vs.</span>{" "}
                {selected.playerBName}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {shortGroup(selected.groupName)}
                </span>
              </>
            ) : (
              "Zum Match"
            )}
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPicking((v) => !v)}
            >
              {picking ? "Auswahl schließen" : "Anderes Match wählen"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={removing}
              onClick={remove}
            >
              {removing ? "Wird entfernt…" : "Entfernen"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Für diesen Spieltag ist noch kein Match of the Week gewählt.
        </p>
      )}

      {showList ? (
        <div className="flex flex-col gap-2.5">
          {groupNames.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {[null, ...groupNames].map((name) => (
                <button
                  key={name ?? "alle"}
                  type="button"
                  aria-pressed={filter === name}
                  onClick={() => setFilter(name)}
                  className={cn(
                    "rounded-full border px-3 py-1 font-medium text-[12.5px] transition-colors",
                    filter === name
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {name === null ? "Alle" : chipLabel(name)}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex max-h-[300px] flex-col gap-1.5 overflow-y-auto pr-1">
            {shownMatches.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Für diesen Spieltag liegen keine Paarungen vor.
              </p>
            ) : (
              shownMatches.map((match) => {
                const isPicked = match.matchId === week.selection?.matchId;
                return (
                  <div
                    key={match.matchId}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2"
                  >
                    <span className="w-16 shrink-0 whitespace-nowrap font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
                      {shortGroup(match.groupName)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">
                      {match.playerAName}{" "}
                      <span className="text-muted-foreground">vs.</span>{" "}
                      {match.playerBName}
                    </span>
                    {isPicked ? (
                      <span className="rounded-md border border-brand-orange/55 bg-brand-orange/12 px-2.5 py-1 font-semibold text-[#9a4b00] text-[13px] dark:text-brand-orange">
                        ✓ Gewählt
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pendingId !== null}
                        onClick={() => pick(match.matchId)}
                      >
                        {pendingId === match.matchId
                          ? "Wird gewählt…"
                          : "Wählen"}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {week.selection ? (
        <YoutubeField
          round={week.round}
          initial={week.selection.youtubeUrl}
          onError={setError}
        />
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </section>
  );
}

function PastRow({ pick }: { pick: MotwPastPick }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLink = pick.youtubeUrl !== null;
  const showField = editing || !hasLink;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[10px] border px-4 py-3",
        // A past pick without a VOD is the open task — visible at a glance.
        !hasLink && "border-brand-orange/45 bg-brand-orange/[0.04]",
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="w-24 shrink-0 whitespace-nowrap font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.06em]">
          Spieltag {pick.round}
        </span>
        <Link
          href={`/match/${pick.matchId}`}
          className="min-w-0 flex-1 truncate font-medium text-sm hover:text-brand-blue dark:hover:text-white"
        >
          {pick.playerAName} <span className="text-muted-foreground">vs.</span>{" "}
          {pick.playerBName}
          <span className="text-muted-foreground">
            {" "}
            · {shortGroup(pick.groupName)}
          </span>
        </Link>
        {hasLink && !editing ? (
          <span className="flex items-center gap-2">
            <a
              href={pick.youtubeUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-[12.5px] hover:text-brand-blue dark:hover:text-white"
            >
              <Play
                aria-hidden
                className="size-3 fill-brand-orange text-brand-orange"
              />
              {shortUrl(pick.youtubeUrl ?? "")}
            </a>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              Ändern
            </Button>
          </span>
        ) : null}
      </div>
      {showField ? (
        <YoutubeField
          round={pick.round}
          initial={pick.youtubeUrl}
          onError={setError}
          onSaved={() => setEditing(false)}
        />
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

// The VOD link editor for one pick. Saving an empty field removes the link.
function YoutubeField({
  round,
  initial,
  onError,
  onSaved,
}: {
  round: number;
  initial: string | null;
  onError: (error: string | null) => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = value.trim() !== (initial ?? "");

  async function save() {
    setSaving(true);
    onError(null);
    const trimmed = value.trim();
    const result = await saveMotwYoutubeUrl({
      round,
      url: trimmed === "" ? null : trimmed,
    });
    setSaving(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onSaved?.();
    router.refresh();
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`youtube-${round}`} className="text-[13px]">
        YouTube-VOD
      </Label>
      <div className="flex gap-2">
        <Input
          id={`youtube-${round}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          autoComplete="off"
        />
        <Button type="button" disabled={!dirty || saving} onClick={save}>
          {saving ? "Wird gespeichert…" : "Speichern"}
        </Button>
      </div>
      <p className="text-[12px] text-muted-foreground">
        {initial
          ? "Link gesetzt — Feld leeren und speichern entfernt ihn."
          : "Noch kein VOD verlinkt."}
      </p>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { PlayerLink } from "@/features/player-profile/components/player-link";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { formatGermanDateTime } from "@/lib/german-time";
import { cn } from "@/lib/utils";
import { liftBanAction } from "../actions";
import type { BanRow } from "../queries";

function date(value: Date): string {
  return formatGermanDateTime(value, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// The Banliste's two sections (docs/plans/banlist.md): who is banned now,
// each with "Aufheben", and the lifted bans as a quieter history below.
export function BanList({ bans }: { bans: BanRow[] }) {
  const active = bans.filter((ban) => ban.liftedAt === null);
  const lifted = bans.filter((ban) => ban.liftedAt !== null);
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <SectionHeader count={active.length} tickColor="navy">
          Gebannt
        </SectionHeader>
        {active.length === 0 ? (
          <p className="rounded-lg border px-4 py-4 text-center text-muted-foreground text-sm">
            Niemand ist gebannt.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((ban) => (
              <BanListRow key={ban.id} ban={ban} />
            ))}
          </div>
        )}
      </section>

      {lifted.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeader count={lifted.length} tickColor="neutral">
            Aufgehoben
          </SectionHeader>
          <div className="flex flex-col gap-2">
            {lifted.map((ban) => (
              <BanListRow key={ban.id} ban={ban} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function BanListRow({ ban }: { ban: BanRow }) {
  const lifted = ban.liftedAt !== null;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:gap-4",
        lifted && "bg-muted/25",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <PlayerAvatar
          identity={ban.person}
          size={cn("mt-0.5 size-[30px] shrink-0", lifted && "opacity-60")}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {ban.inHub ? (
              <PlayerLink
                userId={ban.person.userId}
                name={ban.person.name}
                className={cn(
                  "truncate font-semibold text-[14.5px]",
                  lifted && "text-muted-foreground",
                )}
              />
            ) : (
              <span
                className={cn(
                  "truncate font-semibold text-[14.5px]",
                  lifted && "text-muted-foreground",
                )}
              >
                {ban.person.name}
              </span>
            )}
            {ban.inHub ? null : (
              <span
                title="Hat sich nie im Buli-Hub angemeldet. Der Ban greift, sobald sich dieser Discord-Account anmeldet."
                className="shrink-0 rounded-full border px-[7px] py-[1px] font-semibold text-[10.5px] text-muted-foreground uppercase tracking-[0.06em]"
              >
                Nie im Hub
              </span>
            )}
            <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
              {ban.discordId}
            </span>
          </span>
          <span className="text-[13.5px]">"{ban.reason}"</span>
          <span className="text-[12.5px] text-muted-foreground">
            Gebannt am {date(ban.bannedAt)}
            {ban.bannedByName ? ` von ${ban.bannedByName}` : ""}
            {ban.liftedAt
              ? ` · aufgehoben am ${date(ban.liftedAt)}${ban.liftedByName ? ` von ${ban.liftedByName}` : ""}`
              : ""}
          </span>
        </div>
      </div>
      {lifted ? null : <LiftButton banId={ban.id} name={ban.person.name} />}
    </div>
  );
}

// Lifting is undone by banning again, so one click, no dialog; the button
// asks once inline so a slip does not end a ban.
function LiftButton({ banId, name }: { banId: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lift() {
    setPending(true);
    setError(null);
    const result = await liftBanAction({ banId });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {confirming ? (
        <>
          <span className="text-[13px] text-muted-foreground">
            {name} wieder zulassen?
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Abbrechen
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={lift}>
            {pending ? "Wird aufgehoben…" : "Aufheben"}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setConfirming(true)}
        >
          Ban aufheben
        </Button>
      )}
    </div>
  );
}

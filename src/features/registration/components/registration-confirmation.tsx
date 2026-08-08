import { Tick } from "@/components/tick";
import { formatGermanDateTime } from "@/lib/german-time";
import { PLATFORM_LABELS, type Platform } from "../registration";
import { WithdrawButton } from "./withdraw-button";

export type ConfirmationData = {
  platform: Platform;
  prevSeason: string | null;
  prevName: string | null;
  prevDivision: number | null;
  prevPlacement: number | null;
  skillSelfRating: number | null;
  greatestAchievements: string | null;
};

// One row of the bordered definition table (GO-LIVE-POLISH §4.3). Only rows
// with data are rendered by the caller. On mobile the fixed label column would
// crowd the value, so it stacks below `sm`.
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[180px_1fr] sm:items-baseline sm:gap-4">
      <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.1em]">
        {label}
      </span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}

export function RegistrationConfirmation({
  data,
  seasonName,
  canWithdraw,
  closesAt,
  note,
}: {
  data: ConfirmationData;
  seasonName: string;
  canWithdraw: boolean;
  closesAt: Date | null;
  // Overrides the default subline — e.g. the locked "warte auf deine Paarungen"
  // message once registration has closed.
  note?: string;
}) {
  const deadline = closesAt
    ? formatGermanDateTime(closesAt, {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-lg border px-6 py-5">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
          <p className="font-bold font-heading text-2xl text-brand-blue uppercase tracking-[0.02em] dark:text-white">
            Du bist angemeldet
          </p>
          <div className="flex items-center gap-2">
            <Tick size="s" />
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
              {seasonName}
            </span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          {note ??
            "Deine Anmeldung ist eingegangen. Alles Weitere erfährst du im Discord."}
        </p>
      </div>

      <div className="divide-y overflow-hidden rounded-xl border">
        <Row
          label="Präferierte Plattform"
          value={PLATFORM_LABELS[data.platform]}
        />
        {data.prevSeason ? (
          <Row label="Letzte Saison" value={data.prevSeason} />
        ) : null}
        {data.prevName ? (
          <Row label="Damaliger Name" value={data.prevName} />
        ) : null}
        {data.prevDivision !== null ? (
          <Row label="Division" value={String(data.prevDivision)} />
        ) : null}
        {data.prevPlacement !== null ? (
          <Row label="Platzierung" value={String(data.prevPlacement)} />
        ) : null}
        {data.skillSelfRating !== null ? (
          <Row
            label="Selbsteinschätzung"
            value={`${data.skillSelfRating}/10`}
          />
        ) : null}
        {data.greatestAchievements ? (
          <Row label="Größte VGC-Erfolge" value={data.greatestAchievements} />
        ) : null}
      </div>

      {canWithdraw ? (
        <div className="mt-2 flex flex-col gap-2 border-t pt-5">
          <WithdrawButton />
          {deadline ? (
            <p className="text-[13px] text-muted-foreground">
              Möglich bis zum Anmeldeschluss am {deadline}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

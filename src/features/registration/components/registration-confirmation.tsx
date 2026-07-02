import { SEASON_NAME } from "@/features/staff/registration-window";
import { PLATFORM_LABELS, type Platform } from "../registration";
import { WithdrawButton } from "./withdraw-button";

export type ConfirmationData = {
  platform: Platform;
  prevSeason: string | null;
  prevName: string | null;
  prevDivision: string | null;
  prevPlacement: string | null;
  skillSelfRating: number | null;
  greatestAchievements: string | null;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export function RegistrationConfirmation({
  data,
  canWithdraw,
  closesAt,
}: {
  data: ConfirmationData;
  canWithdraw: boolean;
  closesAt: Date | null;
}) {
  const deadline = closesAt
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(closesAt)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-lg border px-6 py-5">
        <div className="flex items-center gap-3.5">
          <p className="font-heading font-bold text-2xl uppercase tracking-[0.02em] text-brand-blue dark:text-white">
            Du bist angemeldet
          </p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
              {SEASON_NAME}
            </span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Deine Anmeldung ist eingegangen. Alles Weitere erfährst du im Discord.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Row label="Plattform" value={PLATFORM_LABELS[data.platform]} />
        {data.prevSeason ? (
          <>
            <Row label="Letzte Saison" value={data.prevSeason} />
            <Row label="Damaliger Name" value={data.prevName ?? ""} />
            <Row label="Division" value={data.prevDivision ?? ""} />
            <Row label="Platzierung" value={data.prevPlacement ?? ""} />
          </>
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

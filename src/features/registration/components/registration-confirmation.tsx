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
}: {
  data: ConfirmationData;
  canWithdraw: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border px-6 py-5">
        <p className="font-heading font-bold text-2xl uppercase tracking-[0.02em] text-brand-blue dark:text-white">
          Du bist angemeldet
        </p>
        <p className="mt-1 text-muted-foreground text-sm">
          Deine Anmeldung für die nächste Saison ist eingegangen.
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

      {canWithdraw ? <WithdrawButton /> : null}
    </div>
  );
}

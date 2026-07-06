import { dropBannerText } from "../drops";

// The match-page strip for a drop-decided match (every viewer): names the
// counted outcome. The stored content below — played result, replays,
// teamsheets — stays visible as history.
export function DropBanner({
  playerAName,
  playerBName,
  aDropped,
  bDropped,
}: {
  playerAName: string;
  playerBName: string;
  aDropped: boolean;
  bDropped: boolean;
}) {
  return (
    <div className="mb-7 flex flex-col gap-1 rounded-xl border border-destructive/35 bg-destructive/[0.06] px-5 py-4">
      <p className="font-semibold text-destructive text-sm">Drop</p>
      <p className="text-muted-foreground text-sm">
        {dropBannerText({ playerAName, playerBName, aDropped, bDropped })}{" "}
        Bereits gespielte Inhalte bleiben als Historie sichtbar.
      </p>
    </div>
  );
}

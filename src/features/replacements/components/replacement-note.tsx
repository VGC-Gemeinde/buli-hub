import { Tick } from "@/components/tick";
import { PlayerLink } from "@/features/player-profile/components/player-link";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import type { Identity } from "@/features/season/dashboard";

// The line under the Spieler-Dashboard title for either side of a
// replacement (docs/plans/player-replacement.md). The replacement learns why
// their record starts with losses; the replaced player why they are no longer
// in the table.
export function ReplacementNote({
  kind,
  other,
  entryRound,
}: {
  kind: "replacing" | "replaced";
  other: Identity;
  entryRound: number;
}) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-lg border px-4 py-3">
      <PlayerAvatar identity={other} size="size-[30px]" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
          <Tick size="s" color={kind === "replacing" ? "orange" : "neutral"} />
          {kind === "replacing"
            ? "Du spielst als Ersatz"
            : "Dein Platz ist vergeben"}
        </span>
        <p className="text-[14px] leading-relaxed">
          {kind === "replacing" ? (
            <>
              Du hast den Platz von{" "}
              <PlayerLink
                userId={other.userId}
                name={other.name}
                className="font-semibold"
              />{" "}
              ab Spieltag {entryRound} übernommen. Die Spieltage davor zählen
              für deinen Platz als Niederlage.
            </>
          ) : (
            <>
              <PlayerLink
                userId={other.userId}
                name={other.name}
                className="font-semibold"
              />{" "}
              hat deinen Platz ab Spieltag {entryRound} übernommen. Du stehst
              nicht mehr in der Tabelle und steigst ab.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

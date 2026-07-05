import { SpoilerCoverShell } from "@/features/spoilers/components/spoiler-cover-shell";

// Spoiler protection for the featured match's result on the match page
// (neutral viewers only — participants and staff see everything). Unlike the
// general result cover, this one is exempt from the global spoiler switch:
// the Match of the Week stays covered until the viewer reveals it here.
export function MotwSpoiler({
  round,
  groupName,
  seasonLabel,
  playerAName,
  playerBName,
  children,
}: {
  round: number;
  groupName: string;
  seasonLabel: string;
  playerAName: string;
  playerBName: string;
  children: React.ReactNode;
}) {
  return (
    <SpoilerCoverShell
      round={round}
      groupName={groupName}
      seasonLabel={seasonLabel}
      playerAName={playerAName}
      playerBName={playerBName}
      title="Ergebnis versteckt"
      copy="Dieses Match ist das Match of the Week — das Ergebnis bleibt verdeckt, damit dir das Video nicht gespoilert wird."
      tone="motw"
    >
      {children}
    </SpoilerCoverShell>
  );
}

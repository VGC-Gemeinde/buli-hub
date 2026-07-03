"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PLATFORM_LABELS } from "@/features/registration/registration";
import type { Identity } from "@/features/season/dashboard";
import { cn } from "@/lib/utils";
import type { Platform } from "../report";
import { editResult } from "../staff-actions";

type GameSeed = { winnerId: string; replayUrl: string | null };

// Prefill for the editor, built from the stored normal result.
export type NormalEditorInitial = {
  platform: Platform | null;
  games: GameSeed[];
  playerATeamUrl: string | null;
  playerBTeamUrl: string | null;
  videoUrl: string | null;
};

// Neutral (player A vs player B), pre-filled editor for a NORMAL result. Staff
// change game winners / platform / replays / team sheets and save via
// editResult. Free wins / double losses are handled by the panel's award
// buttons; players still do the initial submission.
export function StaffResultEditor({
  matchId,
  playerA,
  playerB,
  initial,
}: {
  matchId: string;
  playerA: Identity;
  playerB: Identity;
  initial: NormalEditorInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform | "">(
    initial.platform ?? "",
  );
  const [winners, setWinners] = useState<string[]>([
    initial.games[0]?.winnerId ?? "",
    initial.games[1]?.winnerId ?? "",
    initial.games[2]?.winnerId ?? "",
  ]);
  const [replays, setReplays] = useState<string[]>([
    initial.games[0]?.replayUrl ?? "",
    initial.games[1]?.replayUrl ?? "",
    initial.games[2]?.replayUrl ?? "",
  ]);
  const [teamA, setTeamA] = useState(initial.playerATeamUrl ?? "");
  const [teamB, setTeamB] = useState(initial.playerBTeamUrl ?? "");
  const [video, setVideo] = useState(initial.videoUrl ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const split =
    winners[0] !== "" && winners[1] !== "" && winners[0] !== winners[1];
  const neededIdx = split ? [0, 1, 2] : [0, 1];

  function setWinner(i: number, id: string) {
    setWinners((prev) => {
      const next = [...prev];
      next[i] = id;
      if (next[0] !== "" && next[1] !== "" && next[0] === next[1]) next[2] = "";
      return next;
    });
  }

  const ready =
    platform !== "" &&
    neededIdx.every((i) => winners[i] !== "") &&
    teamA.trim() !== "" &&
    teamB.trim() !== "" &&
    (platform !== "showdown" ||
      neededIdx.every((i) => replays[i].trim() !== ""));

  async function submit() {
    setPending(true);
    setError(null);
    const report = {
      outcome: "normal" as const,
      platform,
      games: neededIdx.map((i) => ({
        winnerId: winners[i],
        ...(platform === "showdown" ? { replayUrl: replays[i] } : {}),
      })),
      playerATeamUrl: teamA,
      playerBTeamUrl: teamB,
      ...(platform === "cartridge" && video.trim() !== ""
        ? { videoUrl: video }
        : {}),
    };
    const result = await editResult({ matchId, report });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Bearbeiten
      </Button>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Ergebnis bearbeiten</DialogTitle>
          <DialogDescription>
            {playerA.name} vs. {playerB.name}. Überschreibt das gemeldete
            Ergebnis.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label>Plattform</Label>
            <RadioGroup
              className="grid grid-cols-2 gap-2"
              value={platform}
              onValueChange={(v) => setPlatform(v as Platform)}
            >
              {(Object.keys(PLATFORM_LABELS) as Platform[]).map((value) => (
                // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 px-3 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/6"
                >
                  <RadioGroupItem value={value} />
                  <span className="font-medium text-sm">
                    {PLATFORM_LABELS[value]}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label>Sieger je Spiel</Label>
            {neededIdx.map((i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <span className="w-14 shrink-0 font-semibold text-muted-foreground text-xs uppercase">
                    Spiel {i + 1}
                  </span>
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    {[playerA, playerB].map((p) => (
                      <button
                        key={p.userId}
                        type="button"
                        onClick={() => setWinner(i, p.userId)}
                        className={cn(
                          "h-9 truncate rounded-md border px-2 font-semibold text-sm",
                          winners[i] === p.userId
                            ? "border-brand-orange bg-brand-orange/12 text-brand-blue dark:text-white"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
                {platform === "showdown" ? (
                  <Input
                    className="h-9 text-[13px]"
                    value={replays[i]}
                    onChange={(e) =>
                      setReplays((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    placeholder="Replay-Link"
                  />
                ) : null}
              </div>
            ))}
          </div>

          {platform === "cartridge" ? (
            <div className="grid gap-2">
              <Label>Video (optional)</Label>
              <Input
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                placeholder="Video-Link"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Team {playerA.name}</Label>
              <Input
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                placeholder="https://pokepast.es/…"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Team {playerB.name}</Label>
              <Input
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                placeholder="https://pokepast.es/…"
              />
            </div>
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button type="button" disabled={!ready || pending} onClick={submit}>
            {pending ? "Wird gespeichert…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

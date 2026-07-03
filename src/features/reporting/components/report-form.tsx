"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_LABELS } from "@/features/registration/registration";
import type { Identity } from "@/features/season/dashboard";
import { reportMatch } from "../actions";
import type { Platform } from "../report";

type GameState = { won: boolean | null; replayUrl: string };
const emptyGames: GameState[] = [
  { won: null, replayUrl: "" },
  { won: null, replayUrl: "" },
  { won: null, replayUrl: "" },
];

function Fieldset({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// Player report form for a single match. Reporter-relative Win/Loss; the server
// maps it to absolute winners. Rudimentary-but-intentional fidelity (design-
// system tokens) — a designer hand-off + design pass come later.
export function ReportForm({
  matchId,
  playerA,
  playerB,
  reporterId,
  staffOptions,
}: {
  matchId: string;
  playerA: Identity;
  playerB: Identity;
  reporterId: string;
  staffOptions: Identity[];
}) {
  const router = useRouter();
  const opponent = reporterId === playerA.userId ? playerB : playerA;

  const [freeWin, setFreeWin] = useState(false);
  const [platform, setPlatform] = useState<Platform | "">("");
  const [games, setGames] = useState<GameState[]>(emptyGames);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [reason, setReason] = useState("");
  const [discussedWithId, setDiscussedWithId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Game 3 is only played (and shown) when the first two are split 1–1.
  const split =
    games[0].won !== null &&
    games[1].won !== null &&
    games[0].won !== games[1].won;
  const playedIndices = useMemo(() => (split ? [0, 1, 2] : [0, 1]), [split]);

  function setGame(i: number, patch: Partial<GameState>) {
    setGames((prev) => {
      const next = prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g));
      // Clearing a split resets game 3.
      if (
        next[0].won !== null &&
        next[1].won !== null &&
        next[0].won === next[1].won
      ) {
        next[2] = { won: null, replayUrl: "" };
      }
      return next;
    });
  }

  const normalReady =
    platform !== "" &&
    playedIndices.every((i) => games[i].won !== null) &&
    teamA.trim() !== "" &&
    teamB.trim() !== "" &&
    (platform !== "showdown" ||
      playedIndices.every((i) => games[i].replayUrl.trim() !== ""));
  const freeWinReady =
    winnerId !== "" && reason.trim() !== "" && discussedWithId !== "";
  const canSubmit = (freeWin ? freeWinReady : normalReady) && !pending;

  async function submit() {
    setPending(true);
    setError(null);
    const report = freeWin
      ? {
          outcome: "free_win" as const,
          winnerId,
          freeWinReason: reason,
          discussedWithId,
        }
      : {
          outcome: "normal" as const,
          platform,
          games: playedIndices.map((i) => ({
            won: games[i].won,
            ...(platform === "showdown"
              ? { replayUrl: games[i].replayUrl }
              : {}),
          })),
          playerATeamUrl: teamA,
          playerBTeamUrl: teamB,
          ...(platform === "cartridge" && videoUrl.trim() !== ""
            ? { videoUrl }
            : {}),
        };
    const result = await reportMatch({ matchId, report });
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <label className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
        <span className="flex flex-col">
          <span className="font-medium text-sm">Freigewinn melden</span>
          <span className="text-[13px] text-muted-foreground">
            Kein Match gespielt — muss vorab mit dem Staff abgesprochen sein.
          </span>
        </span>
        <Switch checked={freeWin} onCheckedChange={setFreeWin} />
      </label>

      {freeWin ? (
        <>
          <Fieldset label="Wer erhält den Freigewinn?">
            <Select value={winnerId} onValueChange={setWinnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Spieler wählen" />
              </SelectTrigger>
              <SelectContent>
                {[playerA, playerB].map((p) => (
                  <SelectItem key={p.userId} value={p.userId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Fieldset>
          <Fieldset label="Begründung">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Warum gibt es einen Freigewinn?"
            />
          </Fieldset>
          <Fieldset label="Mit welchem Staff-Mitglied abgesprochen?">
            <Select value={discussedWithId} onValueChange={setDiscussedWithId}>
              <SelectTrigger>
                <SelectValue placeholder="Staff wählen" />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((s) => (
                  <SelectItem key={s.userId} value={s.userId}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Fieldset>
          <p className="rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-4 py-3 text-[13px] text-muted-foreground">
            Freigewinne müssen vorab mit dem Staff abgesprochen werden und
            werden erst nach Bestätigung durch ein Staff-Mitglied gewertet.
          </p>
        </>
      ) : (
        <>
          <Fieldset label="Plattform">
            <RadioGroup
              className="grid grid-cols-2 gap-2"
              value={platform}
              onValueChange={(value) => setPlatform(value as Platform)}
            >
              {(Object.keys(PLATFORM_LABELS) as Platform[]).map((value) => (
                // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 px-3.5 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/5"
                >
                  <RadioGroupItem value={value} id={`platform-${value}`} />
                  <span className="font-medium text-sm">
                    {PLATFORM_LABELS[value]}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </Fieldset>

          <div className="grid gap-3">
            <Label>Spiele (gegen {opponent.name})</Label>
            {playedIndices.map((i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="w-16 font-semibold text-muted-foreground text-xs uppercase tracking-[0.08em]">
                    Spiel {i + 1}
                  </span>
                  <RadioGroup
                    className="grid flex-1 grid-cols-2 gap-2"
                    value={
                      games[i].won === null ? "" : games[i].won ? "win" : "loss"
                    }
                    onValueChange={(value) =>
                      setGame(i, { won: value === "win" })
                    }
                  >
                    {[
                      { value: "win", label: "Sieg" },
                      { value: "loss", label: "Niederlage" },
                    ].map((option) => (
                      // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/5"
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={`g${i}-${option.value}`}
                        />
                        <span className="font-medium text-sm">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                {platform === "showdown" ? (
                  <Input
                    value={games[i].replayUrl}
                    onChange={(e) => setGame(i, { replayUrl: e.target.value })}
                    placeholder="Replay-Link (Showdown)"
                    autoComplete="off"
                  />
                ) : null}
              </div>
            ))}
          </div>

          {platform === "cartridge" ? (
            <Fieldset label="Video-Link (optional)">
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="z. B. YouTube-Link"
                autoComplete="off"
              />
            </Fieldset>
          ) : null}

          <Fieldset label={`Teamsheet von ${playerA.name}`}>
            <Input
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              placeholder="https://pokepast.es/…"
              autoComplete="off"
            />
          </Fieldset>
          <Fieldset label={`Teamsheet von ${playerB.name}`}>
            <Input
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              placeholder="https://pokepast.es/…"
              autoComplete="off"
            />
          </Fieldset>
        </>
      )}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div>
        <Button type="button" size="lg" disabled={!canSubmit} onClick={submit}>
          {pending ? "Wird gemeldet…" : "Ergebnis melden"}
        </Button>
      </div>
    </div>
  );
}

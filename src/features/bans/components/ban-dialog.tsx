"use client";

import { CheckCircle2, ExternalLink, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PlayerPicker } from "@/components/player-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { cn } from "@/lib/utils";
import {
  type BanTargetLookup,
  banConflictsFor,
  banPlayer,
  lookupBanTarget,
} from "../actions";
import { type BanConflict, parseDiscordId } from "../bans";
import type { BanCandidate } from "../queries";

type Mode = "hub" | "discord";

// Who the ban is about, however they were named.
type Target =
  | {
      kind: "hub";
      userId: string;
      name: string;
      username: string | null;
      avatarUrl: string | null;
    }
  | {
      kind: "external";
      discordId: string;
      name: string | null;
      username: string | null;
      avatarUrl: string | null;
      notFound: boolean;
    };

// "Spieler bannen" (docs/plans/banlist.md). Left: who — a hub user from the
// searchable list, or a Discord-ID for someone who never signed in (looked
// up via the bot to show who it is). Right: what the ban leaves as it is in
// the current season, each conflict linked to the action that resolves it,
// and the reason. With conflicts the ban needs either their resolution (the
// dialog re-checks when the tab gets focus back) or an explicit "trotzdem".
// Same wide anatomy as the replacement offer.
export function BanDialog({ candidates }: { candidates: BanCandidate[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("hub");
  const [target, setTarget] = useState<Target | null>(null);
  const [conflicts, setConflicts] = useState<BanConflict[] | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [reason, setReason] = useState("");
  const [idInput, setIdInput] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMode("hub");
    setTarget(null);
    setConflicts(null);
    setAcknowledged(false);
    setReason("");
    setIdInput("");
    setLookupError(null);
    setError(null);
  }

  const hubUserId = target?.kind === "hub" ? target.userId : null;
  const loadConflicts = useCallback(async (userId: string) => {
    setConflicts(null);
    setConflicts(await banConflictsFor({ userId }));
  }, []);

  // Staff resolve conflicts in another tab; coming back re-checks them.
  useEffect(() => {
    if (!open || !hubUserId) {
      return;
    }
    const onFocus = () => {
      void banConflictsFor({ userId: hubUserId }).then(setConflicts);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [open, hubUserId]);

  function pickHubUser(userId: string) {
    const candidate = candidates.find((c) => c.userId === userId);
    if (!candidate) {
      return;
    }
    setTarget({ kind: "hub", ...candidate });
    setAcknowledged(false);
    void loadConflicts(userId);
  }

  async function lookup() {
    setLookingUp(true);
    setLookupError(null);
    setTarget(null);
    setConflicts(null);
    const result: BanTargetLookup = await lookupBanTarget({
      discordId: idInput,
    });
    setLookingUp(false);
    if (!result.ok) {
      setLookupError(result.error);
      return;
    }
    setAcknowledged(false);
    if (result.kind === "hub") {
      setTarget({ kind: "hub", ...result.person });
      setConflicts(result.conflicts);
      return;
    }
    setTarget({
      kind: "external",
      discordId: result.discordId,
      name: result.person?.name ?? null,
      username: result.person?.username ?? null,
      avatarUrl: result.person?.avatarUrl ?? null,
      notFound: result.notFound,
    });
    setConflicts([]);
  }

  const conflictCount = conflicts?.length ?? 0;
  const ready =
    target !== null &&
    conflicts !== null &&
    reason.trim() !== "" &&
    (conflictCount === 0 || acknowledged);
  const targetName =
    target === null
      ? null
      : target.kind === "hub"
        ? target.name
        : (target.name ?? `Discord-ID ${target.discordId}`);

  async function submit() {
    if (!target || !ready) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await banPlayer({
      target:
        target.kind === "hub"
          ? { userId: target.userId }
          : { discordId: target.discordId },
      reason,
      acknowledgedConflicts: acknowledged,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      // The server re-derived the conflicts; show what it saw.
      if (target.kind === "hub") {
        void loadConflicts(target.userId);
      }
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Spieler bannen
      </Button>
      <DialogContent className="flex flex-col gap-0 overflow-y-hidden p-0 sm:max-w-[880px]">
        <DialogHeader className="shrink-0 gap-1.5 border-b px-6 pt-5 pr-12 pb-4">
          <DialogTitle className="text-[22px] uppercase tracking-[0.02em]">
            Spieler bannen
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed">
            Gebannte können sich für künftige Saisons nicht mehr anmelden und
            nicht als Ersatz einsteigen. Der Rest des Buli-Hubs bleibt für sie
            offen. Die Begründung sehen nur Staff, der Ban lässt sich aufheben.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_360px] md:overflow-y-hidden">
          {/* Left: who. */}
          <div className="flex min-w-0 flex-col gap-4 px-6 py-5 md:min-h-0">
            <div
              role="tablist"
              aria-label="Wen bannen"
              className="flex w-fit rounded-full bg-muted p-1"
            >
              {(
                [
                  ["hub", "Hub-Spieler"],
                  ["discord", "Discord-ID"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => {
                    setMode(value);
                    setTarget(null);
                    setConflicts(null);
                    setAcknowledged(false);
                    setLookupError(null);
                  }}
                  className={cn(
                    "h-[30px] rounded-full px-4 font-semibold text-[13px] transition-colors",
                    mode === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "hub" ? (
              <PlayerPicker
                players={candidates}
                selectedId={hubUserId}
                onSelect={pickHubUser}
                emptyText="Niemand gefunden. Wer sich nie im Buli-Hub angemeldet hat, lässt sich per Discord-ID bannen."
                listClassName="h-[280px] md:h-[400px]"
              />
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Für Spieler, die nie im Buli-Hub angemeldet waren, etwa aus
                  Saisons vor dem Hub. Die ID findest du in Discord per
                  Rechtsklick auf den Namen, "Benutzer-ID kopieren" (dafür muss
                  der Entwicklermodus an sein).
                </p>
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void lookup();
                  }}
                >
                  <Input
                    aria-label="Discord-ID"
                    value={idInput}
                    onChange={(event) => {
                      setIdInput(event.target.value);
                      setLookupError(null);
                    }}
                    placeholder="z. B. 123456789012345678"
                    inputMode="numeric"
                    autoComplete="off"
                    className="h-10 font-mono tabular-nums"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-10"
                    disabled={lookingUp || parseDiscordId(idInput) === null}
                  >
                    {lookingUp ? "Sucht…" : "Prüfen"}
                  </Button>
                </form>
                {lookupError ? (
                  <p className="text-destructive text-sm">{lookupError}</p>
                ) : null}
                {target?.kind === "hub" ? (
                  <p className="rounded-lg border bg-muted/30 px-3.5 py-2.5 text-[13px] text-muted-foreground">
                    Dieser Discord-Account ist im Buli-Hub:{" "}
                    <span className="font-semibold text-foreground">
                      {target.name}
                    </span>
                    . Der Ban gilt für ihn, Konflikte siehe rechts.
                  </p>
                ) : null}
                {target?.kind === "external" ? (
                  <p className="rounded-lg border bg-muted/30 px-3.5 py-2.5 text-[13px] text-muted-foreground">
                    {target.notFound
                      ? "Discord kennt diese ID nicht. Prüfe sie noch einmal. Bannen lässt sie sich trotzdem."
                      : target.name
                        ? "Nie im Buli-Hub angemeldet. Der Ban greift, sobald sich dieser Account anmeldet."
                        : "Discord konnte gerade nicht gefragt werden. Der Ban greift trotzdem über die ID."}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* Right: what the ban means. */}
          <div className="flex min-w-0 flex-col gap-5 border-t bg-muted/30 px-6 py-5 md:overflow-y-auto md:border-t-0 md:border-l">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
                Person
              </span>
              {target ? (
                <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
                  <PlayerAvatar
                    identity={{
                      userId:
                        target.kind === "hub"
                          ? target.userId
                          : target.discordId,
                      name: targetName ?? "",
                      avatarUrl: target.avatarUrl,
                    }}
                    size="size-8"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold text-[14.5px]">
                      {targetName}
                    </span>
                    <span className="truncate text-[12.5px] text-muted-foreground">
                      {target.kind === "hub"
                        ? target.username
                          ? `@${target.username}`
                          : "Im Buli-Hub"
                        : `ID ${target.discordId} · nie im Hub`}
                    </span>
                  </span>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed px-3 py-3 text-[13px] text-muted-foreground">
                  Noch niemand gewählt.
                </p>
              )}
            </div>

            {target ? (
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
                  Laufende Saison
                </span>
                {conflicts === null ? (
                  <p className="text-[13px] text-muted-foreground">
                    Wird geprüft…
                  </p>
                ) : conflicts.length === 0 ? (
                  <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <CheckCircle2
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    Keine Konflikte. Der Ban betrifft nur künftige Anmeldungen.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {conflicts.map((conflict) => (
                      <div
                        key={conflict.kind}
                        className="flex flex-col gap-2 rounded-lg border border-brand-orange/50 bg-brand-orange/8 px-3.5 py-3"
                      >
                        <span className="flex items-start gap-2 font-medium text-[13.5px]">
                          <TriangleAlert
                            aria-hidden
                            className="mt-px size-4 shrink-0 text-brand-orange"
                          />
                          {conflict.text}
                        </span>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="w-fit bg-background"
                        >
                          <a
                            href={conflict.href}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {conflict.actionLabel}
                            <ExternalLink aria-hidden className="size-3.5" />
                          </a>
                        </Button>
                      </div>
                    ))}
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                      Der Ban ändert an der laufenden Saison nichts. Löse die
                      Konflikte im neuen Tab, danach verschwinden sie hier von
                      selbst. Oder bestätige, dass sie bleiben sollen:
                    </p>
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox is the control */}
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border bg-background px-3.5 py-3 text-[13.5px] has-data-[state=checked]:border-brand-orange">
                      <Checkbox
                        checked={acknowledged}
                        onCheckedChange={(value) =>
                          setAcknowledged(value === true)
                        }
                        className="mt-0.5"
                      />
                      <span>
                        Trotzdem bannen. {targetName} bleibt in der laufenden
                        Saison, der Ban gilt ab der nächsten Anmeldung.
                      </span>
                    </label>
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="ban-reason">
                Begründung{" "}
                <span className="font-normal text-muted-foreground">
                  (nur für Staff sichtbar)
                </span>
              </Label>
              <Textarea
                id="ban-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="bg-background"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t px-6 py-4">
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {targetName ? (
              <>
                <span className="font-semibold text-foreground">
                  {targetName}
                </span>{" "}
                wird für künftige Anmeldungen gesperrt
              </>
            ) : (
              "Noch niemand gewählt"
            )}
          </span>
          {error ? (
            <p className="basis-full text-destructive text-sm sm:order-first">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={!ready || pending}
            onClick={submit}
          >
            {pending ? "Wird gebannt…" : "Bannen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

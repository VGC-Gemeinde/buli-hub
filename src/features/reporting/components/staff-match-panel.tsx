"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tick } from "@/components/tick";
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
import type { Identity } from "@/features/season/dashboard";
import { awardDoubleLoss, confirmFreeWin, reopenMatch } from "../staff-actions";
import { AwardFreewinDialog } from "./award-freewin-dialog";
import { DisputeResolveDialog } from "./dispute-resolve-dialog";
import {
  type NormalEditorInitial,
  StaffResultEditor,
} from "./staff-result-editor";

type ActionState = "none" | "pending" | "reported";

// Role-gated staff controls on a match, laid out as titled action rows. Staff
// do not enter normal results — players report those — but may edit or override
// a reported result and resolve an open dispute.
export function StaffMatchPanel({
  matchId,
  round,
  groupName,
  playerA,
  playerB,
  hasResult,
  isPendingFreeWin,
  pendingWinnerName,
  editorInitial,
  disputeOpen,
  disputeReason,
  disputeOpenedByName,
}: {
  matchId: string;
  round: number;
  groupName: string;
  playerA: Identity;
  playerB: Identity;
  hasResult: boolean;
  isPendingFreeWin: boolean;
  pendingWinnerName?: string | null;
  // Prefill for the „bearbeiten" editor — only for a reported normal result.
  editorInitial?: NormalEditorInitial | null;
  disputeOpen?: boolean;
  disputeReason?: string | null;
  disputeOpenedByName?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state: ActionState = isPendingFreeWin
    ? "pending"
    : hasResult
      ? "reported"
      : "none";

  async function confirm() {
    setPending(true);
    setError(null);
    const result = await confirmFreeWin(matchId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const context =
    state === "pending"
      ? "Der Freewin zählt erst nach Bestätigung für die Tabelle."
      : state === "reported"
        ? "Eingriffe überschreiben bzw. löschen das gemeldete Ergebnis."
        : "Spieler melden Ergebnisse selbst. Staff greift ein, wenn ein Match nicht zustande kommt.";

  const award = (label: string) => (
    <AwardFreewinDialog
      matchId={matchId}
      round={round}
      groupName={groupName}
      playerA={playerA}
      playerB={playerB}
      triggerLabel={label}
    />
  );
  const doubleLoss = (
    <ConfirmDialog
      trigger="Vergeben"
      title="Doppelniederlage vergeben?"
      body="Beide Spieler erhalten eine Niederlage, niemand einen Sieg. Ein bestehendes Ergebnis wird überschrieben."
      confirmLabel="Doppelniederlage vergeben"
      onConfirm={() => awardDoubleLoss({ matchId })}
    />
  );

  return (
    <section className="mt-9 rounded-xl border border-brand-blue/25 bg-brand-blue/[0.03] px-6 pt-5 pb-2 dark:bg-muted/20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Tick size="m" color="navy" />
          <h2 className="font-bold font-heading text-brand-blue text-xl uppercase tracking-[0.03em] dark:text-white">
            Staff
          </h2>
        </div>
        <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
          Nur für Staff sichtbar
        </span>
      </div>
      <p className="mt-1.5 text-[13.5px] text-muted-foreground">{context}</p>

      {disputeOpen ? (
        <ActionRow
          title="Anfechtung offen"
          consequence="Ein Spieler hat das Ergebnis angefochten. Prüfen und entscheiden."
        >
          <DisputeResolveDialog
            matchId={matchId}
            reason={disputeReason ?? null}
            openedByName={disputeOpenedByName ?? null}
          />
        </ActionRow>
      ) : null}

      {state === "pending" ? (
        <>
          <ActionRow
            title="Freewin bestätigen"
            consequence={
              pendingWinnerName
                ? `Sieg für ${pendingWinnerName} wird gewertet.`
                : "Der gemeldete Freewin wird gewertet."
            }
          >
            <Button type="button" disabled={pending} onClick={confirm}>
              Bestätigen
            </Button>
          </ActionRow>
          <ActionRow
            title="Zurückweisen"
            consequence="Meldung wird gelöscht, das Match kann neu gemeldet werden."
          >
            <ConfirmDialog
              trigger="Zurückweisen"
              title="Freewin zurückweisen?"
              body="Die Meldung wird gelöscht und das Match kann neu gemeldet werden."
              confirmLabel="Zurückweisen"
              onConfirm={() => reopenMatch(matchId)}
            />
          </ActionRow>
        </>
      ) : null}

      {state === "reported" ? (
        <>
          {editorInitial ? (
            <ActionRow
              title="Ergebnis bearbeiten"
              consequence="Spiele, Plattform, Replays oder Teams anpassen."
            >
              <StaffResultEditor
                matchId={matchId}
                playerA={playerA}
                playerB={playerB}
                initial={editorInitial}
              />
            </ActionRow>
          ) : null}
          <ActionRow
            title="Ergebnis zurücksetzen"
            consequence="Löscht das Ergebnis. Das Match kann neu gemeldet werden."
          >
            <ConfirmDialog
              trigger="Zurücksetzen"
              triggerDestructive
              title="Ergebnis zurücksetzen?"
              body="Das gemeldete Ergebnis wird gelöscht und das Match kann neu gemeldet werden."
              confirmLabel="Zurücksetzen"
              onConfirm={() => reopenMatch(matchId)}
            />
          </ActionRow>
          <ActionRow
            title="Freewin vergeben"
            consequence="Überschreibt das gemeldete Ergebnis. Begründung erforderlich."
          >
            {award("Vergeben")}
          </ActionRow>
          <ActionRow
            title="Doppelniederlage vergeben"
            consequence="Überschreibt das gemeldete Ergebnis. Beide verlieren."
          >
            {doubleLoss}
          </ActionRow>
        </>
      ) : null}

      {state === "none" ? (
        <>
          <ActionRow
            title="Freewin vergeben"
            consequence="Ein Spieler erhält den Sieg. Begründung erforderlich, sofort gewertet."
          >
            {award("Vergeben")}
          </ActionRow>
          <ActionRow
            title="Doppelniederlage vergeben"
            consequence="Beide Spieler erhalten eine Niederlage, niemand einen Sieg."
          >
            {doubleLoss}
          </ActionRow>
        </>
      ) : null}

      {error ? <p className="py-3 text-destructive text-sm">{error}</p> : null}
    </section>
  );
}

function ActionRow({
  title,
  consequence,
  children,
}: {
  title: string;
  consequence: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-brand-blue/10 border-t py-3.5">
      <div className="min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-[13px] text-muted-foreground">{consequence}</p>
      </div>
      {children}
    </div>
  );
}

function ConfirmDialog({
  trigger,
  triggerDestructive,
  title,
  body,
  confirmLabel,
  onConfirm,
}: {
  trigger: string;
  triggerDestructive?: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await onConfirm();
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Fehler");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        className={
          triggerDestructive
            ? "border-destructive/35 text-destructive"
            : undefined
        }
        onClick={() => setOpen(true)}
      >
        {trigger}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button type="button" disabled={pending} onClick={submit}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

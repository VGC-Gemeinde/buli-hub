"use client";

import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecheckButton } from "@/features/membership/components/recheck-button";
import { Callout } from "@/features/regelwerk/components/callout";
import { DISCORD_INVITE_URL } from "@/lib/discord-invite";

// The membership gate for registered players who left the server, mirroring
// the Regelwerk gate. The body is separate from the Dialog wrapper so the
// /dev/ui gallery can render it — mounting the real dialog there would take
// the gallery hostage, since it is deliberately non-dismissible.

// ~420px; DialogContent's default sm:max-w-sm is too narrow for this copy.
const WIDTH = "sm:max-w-[420px]";

export function MembershipGateBody() {
  return (
    <>
      <DialogHeader>
        {/* Navy, not orange: the brand rule puts navy on structural surfaces,
            and like the Regelwerk gate this is a requirement, not an
            invitation. */}
        <div className="flex items-center gap-2">
          <Tick size="s" color="navy" />
          <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            Discord · Erforderlich
          </span>
        </div>
        <DialogTitle>Discord-Server beitreten</DialogTitle>
        <DialogDescription>
          Alle Spieler der Bundesliga müssen Mitglied auf dem Discord-Server der
          VGC Gemeinde sein. Dein Konto ist dort gerade nicht Mitglied. Tritt
          dem Server wieder bei, um weiterzumachen.
        </DialogDescription>
      </DialogHeader>
      <Callout title="Bis dahin">
        Tabellen, Spielplan und Ergebnisse kannst du weiter ansehen. Nur
        Aktionen sind gesperrt.
      </Callout>
      {/* flex-wrap so the recheck error's basis-full line can break below the
          buttons on desktop instead of compressing the row. */}
      <DialogFooter className="flex-wrap">
        <Button asChild variant="ghost">
          {/* New tab: the dialog cannot be dismissed, so navigating away in
              this tab would strand the player. */}
          <a href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">
            Server beitreten
          </a>
        </Button>
        <RecheckButton label="Ich bin beigetreten" />
      </DialogFooter>
    </>
  );
}

/**
 * Non-dismissible on purpose — but it carries the recheck button itself, so
 * "the only way out" is joining plus one click, and a successful recheck
 * refreshes the gate away.
 */
export function MembershipGateDialog() {
  return (
    <Dialog open>
      <DialogContent
        className={WIDTH}
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <MembershipGateBody />
      </DialogContent>
    </Dialog>
  );
}

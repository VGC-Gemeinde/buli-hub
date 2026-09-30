"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerLink } from "@/features/player-profile/components/player-link";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import type { Identity } from "@/features/season/dashboard";
import { formatGermanDateTime } from "@/lib/german-time";
import { withdrawReplacement } from "../actions";

// A dropped player's replacement as the staff views show it: offered and
// waiting for the answer, or done. Shared by the Drops list and the profile
// staff panel.
export function ReplacementStatusLine({
  replacement,
  entryRound,
  acceptedAt,
  offeredAt,
}: {
  replacement: Identity;
  entryRound: number;
  acceptedAt: Date | null;
  offeredAt: Date;
}) {
  const accepted = acceptedAt !== null;
  return (
    <span className="flex min-w-0 items-start gap-2 text-[13px] text-muted-foreground">
      <PlayerAvatar identity={replacement} size="mt-px size-[18px] shrink-0" />
      <span className="min-w-0">
        {accepted ? "Ersetzt durch " : "Angeboten an "}
        <PlayerLink
          userId={replacement.userId}
          name={replacement.name}
          className="relative font-semibold text-foreground"
        />
        {` ab Spieltag ${entryRound}`}
        {accepted
          ? ` · seit ${ddMM(acceptedAt)}`
          : ` · offen seit ${ddMM(offeredAt)}`}
      </span>
    </span>
  );
}

function ddMM(date: Date): string {
  return formatGermanDateTime(date, { day: "2-digit", month: "2-digit" });
}

// Takes back an unanswered offer; the slot is free to offer again.
export function WithdrawOfferButton({
  replacedUserId,
}: {
  replacedUserId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setPending(true);
    setError(null);
    const result = await withdrawReplacement({ replacedUserId });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={withdraw}
      >
        {pending ? "Wird zurückgezogen…" : "Angebot zurückziehen"}
      </Button>
    </div>
  );
}

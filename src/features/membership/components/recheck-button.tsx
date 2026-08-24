"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { recheckMembership } from "@/features/membership/actions";
import {
  RECHECK_FAILED,
  STILL_NOT_MEMBER,
} from "@/features/membership/membership";

// The one membership recheck control, shared by the blocked registration card
// ("Mitgliedschaft prüfen") and the season gate ("Ich bin beigetreten").
// Mirrors the Regelwerk AcceptButton: inline error, refresh on success —
// the gate and the blocked card are both server state.
export function RecheckButton({
  label,
  variant,
  className,
  onMember,
}: {
  label: string;
  variant?: "default" | "outline";
  className?: string;
  onMember?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recheck() {
    setPending(true);
    setError(null);
    const result = await recheckMembership();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.member === true) {
      onMember?.();
      router.refresh();
      return;
    }
    // false = Discord still says 404 (joins can lag a moment); null = the
    // check could not confirm anything either way.
    setError(result.member === false ? STILL_NOT_MEMBER : RECHECK_FAILED);
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={recheck}
        className={className}
      >
        {pending ? "Wird geprüft…" : label}
      </Button>
      {/* basis-full: the messages are whole sentences, so the error takes its
          own line in the wrapping row/footer instead of being squeezed into a
          column between the buttons. */}
      {error ? (
        <p className="basis-full text-[13px] text-destructive leading-normal">
          {error}
        </p>
      ) : null}
    </>
  );
}

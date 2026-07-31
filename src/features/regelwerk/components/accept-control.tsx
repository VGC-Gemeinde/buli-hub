"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { acceptRegelwerk } from "@/features/regelwerk/actions";

// The confirm button, shared by both prompt dialogs. There is exactly one
// acceptance control in the product — the rules page itself is read-only, so a
// player only ever confirms where they are actually being asked: at
// registration, or in the prompt that tells them something is outstanding.
//
// One button, no confirmation checkbox: the dialog's own copy already says
// what is being confirmed, and we are recording that a player agreed, not
// building a case against them.
export function AcceptButton({
  onAccepted,
  className,
}: {
  onAccepted?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    const result = await acceptRegelwerk();
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    setPending(false);
    onAccepted?.();
    // The lock and the prompt are both server state.
    router.refresh();
  }

  return (
    <>
      {error ? (
        <p className="text-[13px] text-destructive sm:mr-auto">{error}</p>
      ) : null}
      <Button
        type="button"
        disabled={pending}
        onClick={confirm}
        className={className}
      >
        {pending ? "Wird gespeichert…" : "Regelwerk bestätigen"}
      </Button>
    </>
  );
}

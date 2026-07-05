"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { withdraw } from "../actions";

export function WithdrawButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    const result = await withdraw();
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    // Re-render the route so the confirmation view gives way to the form.
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          type="button"
          variant="outline"
          className="text-destructive hover:text-destructive"
          disabled={pending}
          onClick={onClick}
        >
          {pending ? "Wird abgemeldet…" : "Anmeldung zurückziehen"}
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

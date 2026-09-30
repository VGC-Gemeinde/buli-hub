"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { syncSeasonDiscordNow } from "../actions";

// "Jetzt abgleichen": one converge run right now. The dashboard's Discord
// todo carries it; the report lands in the sync state and the re-rendered
// page shows what is left.
export function DiscordSyncButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setPending(true);
    setError(null);
    const result = await syncSeasonDiscordNow();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
    router.refresh();
  }

  return (
    <span className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={sync}
      >
        {pending ? "Wird abgeglichen…" : "Jetzt abgleichen"}
      </Button>
      {error ? (
        <span className="text-[12.5px] text-destructive">{error}</span>
      ) : null}
    </span>
  );
}

"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The small refresh icon next to the roster stamp. The membership sweep runs
// in the server render of the section, so refreshing the route *is* the
// re-check; the icon spins until the fresh render is in.
export function RefreshListButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground"
      aria-label="Neu prüfen"
      title="Neu prüfen"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw
        aria-hidden
        className={cn("size-3.5", pending && "animate-spin")}
      />
    </Button>
  );
}

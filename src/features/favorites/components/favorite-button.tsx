"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setFavorite } from "../actions";

// The favourite toggle on a player's profile (docs/plans/favorites.md).
// Optimistic: the star flips at once and flips back with a message if the
// server refuses. Only rendered for a signed-in viewer on someone else's
// profile.
export function FavoriteButton({
  playerId,
  initialOn,
}: {
  playerId: string;
  initialOn: boolean;
}) {
  const [on, setOn] = useState(initialOn);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const result = await setFavorite({ playerId, on: next });
      if (!result.ok) {
        setOn(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <Button
        type="button"
        variant="outline"
        aria-pressed={on}
        disabled={pending}
        title={
          on
            ? "Aus deinen Favoriten entfernen"
            : "Als Favorit merken. Nur du siehst das."
        }
        onClick={toggle}
        className={cn(
          "min-w-[118px]",
          on &&
            "border-brand-orange/45 bg-brand-orange/6 hover:bg-brand-orange/10",
        )}
      >
        <Star
          aria-hidden
          className={cn(
            on
              ? "fill-brand-orange text-brand-orange"
              : "text-muted-foreground",
          )}
        />
        Favorit
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

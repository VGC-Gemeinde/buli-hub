import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// The marker before a favourite's name in tables and match rows
// (docs/plans/favorites.md). A marker, not a control: no hover, no click.
// Orange because a favourite is the viewer's own choice ("you / yours").
export function FavoriteStar({ className }: { className?: string }) {
  return (
    <span
      title="Dein Favorit"
      className={cn("inline-flex shrink-0", className)}
    >
      <Star
        aria-hidden
        className="size-3 fill-brand-orange text-brand-orange"
      />
      <span className="sr-only">Favorit</span>
    </span>
  );
}

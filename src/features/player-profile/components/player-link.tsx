import Link from "next/link";
import { cn } from "@/lib/utils";

// A player name as a link to their public profile — the shared affordance
// wherever a name is plain text (standings rows, match-page scoreboard, MotW
// billboard, staff lists). Inherits the surrounding typography; the subtle
// underline appears on hover only. Never nest it inside rows that are
// themselves links.
export function PlayerLink({
  userId,
  name,
  className,
}: {
  userId: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      href={`/spieler/${userId}`}
      className={cn("hover:underline hover:underline-offset-2", className)}
    >
      {name}
    </Link>
  );
}

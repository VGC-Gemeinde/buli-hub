import { Tick } from "@/components/tick";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { playerName } from "@/lib/player-name";

// Identity block of the profile page (GO-LIVE-POLISH §4.1): 84px round avatar,
// condensed 40px name, a role badge (outline pill with a Tick S inside) and the
// muted @handle. The name uses the shared fallback chain so it is never empty.
export function ProfileHeader({
  displayName,
  username,
  avatarUrl,
  roleLabel,
}: {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  roleLabel: string;
}) {
  const name = playerName(displayName, username);

  return (
    <div className="flex items-center gap-4 sm:gap-[22px]">
      <Avatar className="size-[84px] shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="font-semibold text-2xl">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-1.5">
          <h1 className="min-w-0 truncate text-[32px] text-brand-blue leading-none sm:text-[40px] dark:text-white">
            {name}
          </h1>
          <span className="inline-flex shrink-0 items-center gap-[7px] rounded-full border px-3 py-1 font-semibold text-muted-foreground text-xs uppercase tracking-[0.08em]">
            <Tick size="s" />
            {roleLabel}
          </span>
        </div>
        {username ? (
          <p className="break-all text-muted-foreground text-sm">@{username}</p>
        ) : null}
      </div>
    </div>
  );
}

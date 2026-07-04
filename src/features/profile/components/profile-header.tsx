import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
  const name = displayName ?? "Discord-Nutzer";

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <Avatar className="size-16 shrink-0 sm:size-20">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="font-semibold text-2xl">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="min-w-0 break-words text-2xl text-brand-blue sm:text-4xl dark:text-white">
            {name}
          </h1>
          <Badge variant="secondary" className="shrink-0">
            {roleLabel}
          </Badge>
        </div>
        {username ? (
          <p className="break-all text-muted-foreground text-sm">@{username}</p>
        ) : null}
      </div>
    </div>
  );
}

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotwBadge } from "./motw-badge";

// The Match-of-the-Week strip on the match page (design/MATCH-OF-THE-WEEK.md
// §4.1): marks the featured match for every viewer and carries the VOD link
// once it exists — no placeholder here, the overview billboard holds that
// slot. Server-renderable; the spoiler reveal lives inline in ReportSummary.
export function MotwMatchBanner({
  round,
  youtubeUrl,
}: {
  round: number;
  youtubeUrl: string | null;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-xl border border-brand-orange/40 bg-brand-orange/5 px-4 py-3">
      <MotwBadge label="full" />
      <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.08em]">
        Spieltag {round}
      </span>
      {youtubeUrl ? (
        <Button asChild size="sm" className="ml-auto">
          <a href={youtubeUrl} target="_blank" rel="noreferrer">
            <Play aria-hidden className="size-3.5 fill-current" />
            Auf YouTube ansehen
          </a>
        </Button>
      ) : null}
    </div>
  );
}

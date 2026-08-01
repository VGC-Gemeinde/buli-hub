import { Tick } from "@/components/tick";
import { ReminderTrigger } from "@/features/regelwerk/components/prompt-dialogs";

// What the rules page shows a signed-in player about their own acceptance.
//
// Deliberately not an acceptance control: the document is a document, and
// agreeing to it happens where we ask — at registration, or in the prompt.
// Unaccepted players get a way to open that prompt; accepted ones get a quiet
// line telling them they are done, so nobody has to wonder.

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

export function AcceptanceStatus({
  seasonNumber,
  acceptedAt,
}: {
  seasonNumber: number;
  acceptedAt: string | null;
}) {
  if (acceptedAt === null) {
    return <ReminderTrigger seasonNumber={seasonNumber} />;
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted p-5">
      <Tick size="s" color="neutral" />
      <span className="text-[13px] text-muted-foreground leading-[1.55]">
        Bestätigt am{" "}
        <strong className="font-semibold text-foreground">
          {formatTimestamp(acceptedAt)}
        </strong>
      </span>
    </div>
  );
}

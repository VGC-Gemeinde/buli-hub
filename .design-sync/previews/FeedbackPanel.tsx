import { FeedbackActions, FeedbackPanel } from "buli-hub";
import { useState } from "react";
import type { FeedbackKind } from "@/features/feedback/feedback";

/* The body of the "Feedback geben" dialog: kind (Fehler / Idee, only for
 * those who may file ideas), title, description, screenshots and the
 * automatically captured context. Shown with its action bar, at the dialog's
 * width, as the dialog pins it below the scrolling body. */

// A 1x1 transparent GIF, as in the app's gallery: no network request.
const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

type Attachment = { id: string; name: string; previewUrl: string };

function Form({
  canSubmitIdea = true,
  initialKind = "bug",
  initialTitle = "",
  initialBody = "",
  attachments = [],
  error = null,
}: {
  canSubmitIdea?: boolean;
  initialKind?: FeedbackKind;
  initialTitle?: string;
  initialBody?: string;
  attachments?: Attachment[];
  error?: string | null;
}) {
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [held, setHeld] = useState(attachments);
  return (
    <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-background">
      <div className="p-6">
        <FeedbackPanel
          canSubmitIdea={canSubmitIdea}
          kind={kind}
          onKindChange={setKind}
          title={title}
          onTitleChange={setTitle}
          body={body}
          onBodyChange={setBody}
          attachments={held}
          onRemoveAttachment={(id) =>
            setHeld((current) => current.filter((item) => item.id !== id))
          }
          capturedPath="/match/8f2c"
          error={error}
        />
      </div>
      <FeedbackActions
        disabled={title.trim() === "" || body.trim() === ""}
        onSubmit={() => {}}
        onClose={() => {}}
      />
    </div>
  );
}

export function Ausgefuellt() {
  return (
    <Form
      initialTitle="Ergebnis lässt sich nicht melden"
      initialBody="Beim Melden von Spieltag 3 gegen Blaubeerkuchen passiert nach Absenden nichts. Ich hatte beide Teamsheets eingefügt und 2:1 ausgewählt."
      attachments={[
        { id: "s1", name: "screenshot-meldung.webp", previewUrl: PIXEL },
      ]}
    />
  );
}

export function Gesendet() {
  return (
    <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-background">
      <div className="p-6">
        <FeedbackPanel
          canSubmitIdea
          kind="bug"
          onKindChange={() => {}}
          title=""
          onTitleChange={() => {}}
          body=""
          onBodyChange={() => {}}
          sent={{
            threadUrl: "https://discord.com/channels/1/2",
            attachmentCount: 2,
            attachmentsPosted: true,
          }}
        />
      </div>
      <FeedbackActions sent onSubmit={() => {}} onClose={() => {}} />
    </div>
  );
}

export function IdeeOhneScreenshots() {
  return (
    <Form
      initialKind="idea"
      initialTitle="Kalender-Export"
      initialBody="Die Spieltage als Kalenderdatei, damit ich die Deadlines im Handy habe."
    />
  );
}

export function NurFehlerMitFehlermeldung() {
  return (
    <Form
      canSubmitIdea={false}
      initialTitle="Spieltag lädt nicht"
      initialBody="Die Seite bleibt weiß."
      attachments={[
        { id: "s1", name: "screenshot-1.webp", previewUrl: PIXEL },
        { id: "s2", name: "screenshot-2.webp", previewUrl: PIXEL },
        { id: "s3", name: "screenshot-3.webp", previewUrl: PIXEL },
      ]}
      error="Senden hat nicht geklappt. Versuch es gleich noch einmal."
    />
  );
}

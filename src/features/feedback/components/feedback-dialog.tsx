"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitFeedback } from "../actions";
import type { FeedbackKind } from "../feedback";
import { FeedbackPanel, type FeedbackSent } from "./feedback-panel";

// The intake dialog, opened from the user menu so it is one click away from
// wherever something broke. The route is captured from the router rather than
// typed by the reporter — that context is exactly what reports never carry.
export function FeedbackDialog({
  open,
  onOpenChange,
  canSubmitIdea,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canSubmitIdea: boolean;
}) {
  const pathname = usePathname();
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<FeedbackSent | null>(null);

  function close() {
    onOpenChange(false);
  }

  // Reset only once the dialog is fully closed, so the success state does not
  // flash back to an empty form on the way out.
  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setKind("bug");
      setTitle("");
      setBody("");
      setError(null);
      setSent(null);
    }
  }

  async function submit() {
    setPending(true);
    setError(null);
    const result = await submitFeedback({
      kind,
      title,
      body,
      path: pathname,
      userAgent:
        typeof navigator === "undefined"
          ? ""
          : navigator.userAgent.slice(0, 200),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent({ threadUrl: result.threadUrl });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Default p-4 kept on purpose: DialogFooter's bleed bar (-mx-4 -mb-4)
          only lines up with that padding. */}
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader className="gap-1.5 pr-8">
          <DialogTitle className="text-[22px] uppercase tracking-[0.02em]">
            {sent ? "Danke!" : "Feedback geben"}
          </DialogTitle>
          {sent ? null : (
            <DialogDescription className="text-[13.5px] leading-relaxed">
              {canSubmitIdea
                ? "Melde einen Fehler oder schlage eine Idee vor. Beides landet direkt bei den Organisatoren."
                : "Etwas funktioniert nicht? Beschreibe kurz, was passiert ist — die Meldung landet direkt bei den Organisatoren."}
            </DialogDescription>
          )}
        </DialogHeader>
        <FeedbackPanel
          canSubmitIdea={canSubmitIdea}
          kind={kind}
          onKindChange={setKind}
          title={title}
          onTitleChange={setTitle}
          body={body}
          onBodyChange={setBody}
          capturedPath={pathname}
          pending={pending}
          error={error}
          sent={sent}
          onSubmit={submit}
          onClose={close}
        />
      </DialogContent>
    </Dialog>
  );
}

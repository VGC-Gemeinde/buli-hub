"use client";

import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitFeedback } from "../actions";
import { MAX_ATTACHMENTS, validateAttachments } from "../attachments";
import type { FeedbackKind } from "../feedback";
import { compressImage } from "./compress";
import {
  type Attachment,
  FeedbackPanel,
  type FeedbackSent,
} from "./feedback-panel";

// The intake dialog, opened from the user menu or the footer so it is one
// click away from wherever something broke. The route is captured from the
// router rather than typed by the reporter — that context is exactly what
// reports never carry.

type Held = Attachment & { file: File };

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
  const [attachments, setAttachments] = useState<Held[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<FeedbackSent | null>(null);
  const nextId = useRef(0);

  function releasePreviews(items: readonly Held[]) {
    for (const item of items) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }

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
      releasePreviews(attachments);
      setAttachments([]);
      setError(null);
      setSent(null);
    }
  }

  async function addFiles(files: File[]) {
    setError(null);
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setError(`Maximal ${MAX_ATTACHMENTS} Bilder pro Meldung.`);
      return;
    }

    const accepted = await Promise.all(files.slice(0, room).map(compressImage));
    const held = accepted.map((file, index) => ({
      id: `a${nextId.current + index}`,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      file,
    }));
    nextId.current += accepted.length;

    // Validate the resulting set, so the total-size rule is enforced before
    // the reporter has typed a report they might lose.
    const combined = [...attachments, ...held];
    const validated = validateAttachments(
      combined.map((item) => ({ size: item.file.size, type: item.file.type })),
    );
    if (!validated.ok) {
      releasePreviews(held);
      setError(validated.error);
      return;
    }
    setAttachments(combined);

    if (files.length > room) {
      setError(
        `Nur ${MAX_ATTACHMENTS} Bilder pro Meldung — der Rest wurde nicht übernommen.`,
      );
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const gone = current.filter((item) => item.id === id);
      releasePreviews(gone);
      return current.filter((item) => item.id !== id);
    });
    setError(null);
  }

  async function submit() {
    setPending(true);
    setError(null);
    const result = await submitFeedback(
      {
        kind,
        title,
        body,
        path: pathname,
        userAgent:
          typeof navigator === "undefined"
            ? ""
            : navigator.userAgent.slice(0, 200),
      },
      attachments.map((item) => item.file),
    );
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    releasePreviews(attachments);
    setAttachments([]);
    setSent({
      threadUrl: result.threadUrl,
      attachmentCount: result.attachmentCount,
      attachmentsPosted: result.attachmentsPosted,
    });
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
          attachments={attachments}
          onAddFiles={addFiles}
          onRemoveAttachment={removeAttachment}
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

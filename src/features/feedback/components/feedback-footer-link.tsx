"use client";

import { useState } from "react";
import { FeedbackDialog } from "./feedback-dialog";

// The footer's entry point into the intake dialog. Styled as a footer link
// rather than a button: it sits between Impressum and Datenschutz and should
// read as one of them, not as a call to action.
export function FeedbackFooterLink({
  canSubmitIdea,
}: {
  canSubmitIdea: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        Feedback
      </button>
      <FeedbackDialog
        open={open}
        onOpenChange={setOpen}
        canSubmitIdea={canSubmitIdea}
      />
    </>
  );
}

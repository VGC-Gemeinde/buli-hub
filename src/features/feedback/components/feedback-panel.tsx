"use client";

import { ActionLink } from "@/components/links";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BODY_MAX, type FeedbackKind, TITLE_MAX } from "../feedback";

// The intake form's body, presentational only — every piece of state comes
// from the parent. The dialog owns the state and the server call; the gallery
// renders this directly to show each state.

const KINDS: { value: FeedbackKind; title: string; body: string }[] = [
  {
    value: "bug",
    title: "Fehler",
    body: "Etwas funktioniert nicht oder sieht falsch aus.",
  },
  {
    value: "idea",
    title: "Idee",
    body: "Ein Vorschlag, was der Hub zusätzlich können sollte.",
  },
];

// Uppercase micro label (DESIGN.md §8.6).
const MICRO = "font-semibold text-[12px] uppercase tracking-[0.12em]";

// The counter is noise until it matters — it appears on the last stretch.
const COUNTER_FROM = BODY_MAX - 200;

export type FeedbackSent = { threadUrl: string | null };

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={cn(MICRO, "text-muted-foreground")}>
      {children}
    </label>
  );
}

export function FeedbackPanel({
  canSubmitIdea,
  kind,
  onKindChange,
  title,
  onTitleChange,
  body,
  onBodyChange,
  capturedPath = "/",
  pending = false,
  error = null,
  sent = null,
  onSubmit,
  onClose,
}: {
  canSubmitIdea: boolean;
  kind: FeedbackKind;
  onKindChange: (kind: FeedbackKind) => void;
  title: string;
  onTitleChange: (title: string) => void;
  body: string;
  onBodyChange: (body: string) => void;
  capturedPath?: string;
  pending?: boolean;
  error?: string | null;
  sent?: FeedbackSent | null;
  onSubmit: () => void;
  onClose: () => void;
}) {
  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <Tick size="m" className="mt-1.5" />
          <div className="flex flex-col gap-1.5">
            <p className="text-[15px] leading-snug">
              Deine Meldung ist angekommen und liegt bei den Organisatoren.
            </p>
            {sent.threadUrl ? (
              <p className="text-[13px] text-muted-foreground">
                Rückfragen laufen über den Discord-Thread.
              </p>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Rückfragen kommen bei Bedarf über Discord auf dich zu.
              </p>
            )}
          </div>
        </div>

        {sent.threadUrl ? (
          <ActionLink href={sent.threadUrl}>Zum Discord-Thread</ActionLink>
        ) : null}

        <DialogFooter>
          <Button type="button" className="w-full sm:w-auto" onClick={onClose}>
            Schließen
          </Button>
        </DialogFooter>
      </div>
    );
  }

  const trimmedBody = body.trim();
  const incomplete =
    title.trim().length < 3 ||
    trimmedBody.length < 10 ||
    title.trim().length > TITLE_MAX ||
    trimmedBody.length > BODY_MAX;

  return (
    <div className="flex flex-col gap-5">
      {canSubmitIdea ? (
        <RadioGroup
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
          value={kind}
          onValueChange={(value) => onKindChange(value as FeedbackKind)}
        >
          {KINDS.map((option) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors",
                "hover:bg-muted/60",
                "has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/6 has-data-[state=checked]:hover:bg-brand-orange/6",
              )}
            >
              <RadioGroupItem value={option.value} className="mt-0.5" />
              <span className="flex flex-col gap-1">
                <span className="font-semibold text-[14px]">
                  {option.title}
                </span>
                <span className="text-[12.5px] text-muted-foreground leading-snug">
                  {option.body}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
      ) : null}

      <div className="grid gap-2">
        <FieldLabel htmlFor="feedback-title">Worum geht es?</FieldLabel>
        <Input
          id="feedback-title"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={
            kind === "bug"
              ? "Kurz in einem Satz, z. B. „Spieltag lädt nicht“"
              : "Kurz in einem Satz, z. B. „Kalender-Export“"
          }
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel htmlFor="feedback-body">Beschreibung</FieldLabel>
          {trimmedBody.length > COUNTER_FROM ? (
            <span
              className={cn(
                "text-[12px] text-muted-foreground tabular-nums",
                trimmedBody.length > BODY_MAX && "text-destructive",
              )}
            >
              {trimmedBody.length}/{BODY_MAX}
            </span>
          ) : null}
        </div>
        {/* The primitive is field-sizing-content, so it grows while typing and
            `rows` does nothing — only the floor is ours to set. 64px would
            invite a one-line report. */}
        <Textarea
          id="feedback-body"
          className="min-h-[124px]"
          value={body}
          maxLength={BODY_MAX}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder={
            kind === "bug"
              ? "Was hast du gemacht, was ist passiert, was hättest du erwartet?"
              : "Was soll der Hub können — und was wird dadurch einfacher?"
          }
        />
      </div>

      {/* Naming the captured context beats a vague „wir schicken etwas mit". */}
      <div className="flex flex-col gap-2 rounded-lg bg-muted px-4 py-3">
        <div className="flex items-center gap-2">
          <Tick size="s" color="neutral" />
          <span className={cn(MICRO, "text-muted-foreground")}>
            Automatisch dabei
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
          <span className="font-mono text-[12px] text-foreground">
            {capturedPath}
          </span>
          <span className="text-border">·</span>
          <span>Name &amp; Rolle</span>
          <span className="text-border">·</span>
          <span>Spieltag</span>
          <span className="text-border">·</span>
          <span>Browser &amp; Build</span>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/35 bg-destructive/[0.06] px-4 py-3 text-[13.5px] text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onClose}
        >
          Abbrechen
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={incomplete || pending}
          onClick={onSubmit}
        >
          {pending ? "Wird gesendet…" : "Absenden"}
        </Button>
      </DialogFooter>
    </div>
  );
}

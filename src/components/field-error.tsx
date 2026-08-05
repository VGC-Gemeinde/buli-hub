import { cn } from "@/lib/utils";

/**
 * The message under an invalid form control. Sized to match the muted hint
 * paragraphs that already sit in that slot, so a field does not jump when the
 * message appears — it only changes colour.
 *
 * Renders nothing without a message, so call sites can pass a possibly-absent
 * error straight through. Pair it with `aria-invalid` and `aria-describedby`
 * on the control it belongs to.
 */
export function FieldError({
  id,
  message,
  className,
}: {
  id: string;
  message?: string | null;
  className?: string;
}) {
  if (!message) {
    return null;
  }
  return (
    <p
      id={id}
      role="alert"
      className={cn("text-[13px] text-destructive leading-snug", className)}
    >
      {message}
    </p>
  );
}

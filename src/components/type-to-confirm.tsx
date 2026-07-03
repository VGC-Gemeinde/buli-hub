import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The type-to-confirm field: the user types `phrase` exactly to confirm a
// destructive or irreversible action. Dumb — the caller owns the value, the
// match check (`matchesConfirmationPhrase`) that gates its confirm button, and
// (optionally) the error to show below the input.
export function TypeToConfirm({
  id,
  phrase,
  value,
  onChange,
  error,
}: {
  id: string;
  phrase: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        Gib{" "}
        <span className="font-semibold text-brand-blue dark:text-white">
          {phrase}
        </span>{" "}
        ein, um zu bestätigen
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={phrase}
        autoComplete="off"
      />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

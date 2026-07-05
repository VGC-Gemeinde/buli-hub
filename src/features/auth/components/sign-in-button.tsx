import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { signInWithDiscord } from "../actions";

type SignInButtonProps = Pick<
  ComponentProps<typeof Button>,
  "variant" | "size" | "className"
>;

export function SignInButton(props: SignInButtonProps) {
  return (
    <form action={signInWithDiscord}>
      <Button type="submit" {...props}>
        Mit Discord anmelden
      </Button>
    </form>
  );
}

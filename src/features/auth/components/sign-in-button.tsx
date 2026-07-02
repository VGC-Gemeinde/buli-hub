import { Button } from "@/components/ui/button";
import { signInWithDiscord } from "../actions";

export function SignInButton() {
  return (
    <form action={signInWithDiscord}>
      <Button type="submit">Mit Discord anmelden</Button>
    </form>
  );
}

// Site-wide spoiler protection for the public Bereich (docs/plans/
// public-spoiler-protection.md): foreign results are covered by default; one
// cookie-backed switch reveals everything at once — except the Match of the
// Week, which keeps its own permanent protection.

// The cookie marks the *opt-out*: absence (or any other value) means
// protected, the default. Stored per browser; works for anonymous visitors.
export const SPOILERS_OFF_COOKIE = "spoilers_off";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function parseSpoilersOff(value: string | undefined): boolean {
  return value === "1";
}

// The document.cookie string for a preference change: opting out persists
// for a year, opting back in (the default) drops the cookie.
export function spoilersOffCookie(off: boolean): string {
  return off
    ? `${SPOILERS_OFF_COOKIE}=1; path=/; max-age=${ONE_YEAR}; samesite=lax`
    : `${SPOILERS_OFF_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

// Whether a row's score is covered on the public overview. MotW rows never
// reach this rule — they render their badge permanently.
export function scoreHidden(input: {
  reported: boolean;
  isMine: boolean;
  spoilersOff: boolean;
}): boolean {
  return input.reported && !input.isMine && !input.spoilersOff;
}

// Whether a public match row's result is covered, the full rule: the Match of
// the Week and a result under embargo are covered whenever there is a result,
// whatever the switch says (the switch cannot open what is not public, and
// the MotW keeps its own protection); every other row follows `scoreHidden`.
// Shared by the match rows and everything coupled to them (the Favoriten
// form cell, Platz and Bilanz), so the two can never disagree.
export function rowScoreHidden(input: {
  reported: boolean;
  isMotw: boolean;
  embargoed: boolean;
  isMine: boolean;
  spoilersOff: boolean;
}): boolean {
  return input.isMotw || input.embargoed ? input.reported : scoreHidden(input);
}

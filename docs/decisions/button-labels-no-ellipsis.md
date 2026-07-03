# Button labels: no trailing „…" on dialog openers

**Decided:** 2026-07-03

Buttons that open a dialog use **plain labels** — „Freewin", „Vergeben",
„Zurücksetzen", „Zurückweisen" — **not** the trailing-ellipsis form („Freewin…",
„Vergeben…"). The ellipsis reads as truncated text rather than an
„opens-a-dialog" cue, and it added no clarity in testing.

The `SAISON-DASHBOARD.md` hand-off (§7) introduced the convention „buttons that
open a dialog end their label with …"; we are **not** adopting it. Future
hand-offs should use plain button labels.

Where `…` is still fine (and stays): loading/pending states („Wird gemeldet…",
„Wird vergeben…"), input placeholders („https://pokepast.es/…", „Staff-Mitglied
wählen …") — there it signals „in progress" or „example", not a button action.

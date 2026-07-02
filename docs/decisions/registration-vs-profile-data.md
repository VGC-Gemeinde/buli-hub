# Where player data lives: registration snapshot vs. profile live state

**Decided:** 2026-07-02

When a new player-data field appears, decide where it lives by what the value
*feeds*, not by how often it changes:

- **Registration (per-season snapshot)** — the value is an input to a
  specific season's setup, and staff need what the player committed to *for
  that season*, frozen at signup. Example: **platform preference**
  (Showdown vs. Cartridge) seeds the division setup, so it belongs on the
  registration row and must not change retroactively when the player's later
  preference shifts.
- **Profile (live, mutable state)** — the value is a capability or preference
  consumed continuously, where the current truth is what matters. Example:
  **capture-card ownership** does not affect league setup; if a player buys a
  card mid-season they should be featurable immediately, so a frozen signup
  answer would be wrong. It lives on the profile and is editable any time.

"How often does it change" is the wrong test: capture-card ownership is
long-standing hardware, yet still belongs on the profile because it is
consumed live. Platform preference is the season-setup input, so it is
snapshotted even though a player's overall preference is fairly stable.

Not built: a profile default that pre-fills a registration field. Tempting for
stable values, but speculative — add only if re-entry friction is a real
complaint.

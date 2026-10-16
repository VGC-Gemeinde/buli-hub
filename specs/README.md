# Specs

One directory per feature, created by GitHub Spec Kit (`/speckit-specify`). A directory holds the
feature's spec, its approved mockups (`mockups/`, open the HTML files in a browser), the plan, the
research behind it and the task list.

A directory is history: it is frozen when its feature ships and records what was built. Later
changes get a new spec; an older one only receives a backlink note at its top. Precedence when
documents disagree: code and tests, then the newest spec, then older specs and the legacy
documents in `docs/plans/` and `docs/decisions/`. Process and rules:
`.specify/memory/constitution.md`.

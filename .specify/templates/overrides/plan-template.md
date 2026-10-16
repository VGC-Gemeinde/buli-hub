# Implementation Plan: [FEATURE]

**Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  The stack is pinned (constitution Principle III). Keep these lines; fill only the
  feature-specific ones and mark unknowns NEEDS CLARIFICATION.
-->

**Stack**: Next.js App Router + TypeScript, Supabase (Postgres, Auth, Storage), Drizzle ORM, Zod,
Tailwind CSS + shadcn/ui. New dependencies: [none | name@exact-version, approved because ...]

**Testing**: Vitest unit tests (domain logic), Vitest integration tests against the local Supabase
stack. No E2E.

**Target**: Cloud Run container; desktop and phone browsers, light and dark mode.

**Affected areas**: [features under src/features/ that this touches and why]

**Reused building blocks**: [existing functions, projections, components this builds on, e.g.
publicLeagueOverview, groupStandingsInput, StaffPage, StaffWeekPager, DESIGN.md §8 primitives]

**Legacy context read**: [docs/plans/*.md, docs/decisions/*.md, design/*.md and older specs/
consulted for the existing behavior this changes]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

<!-- Replace with the concrete files this feature adds or changes. -->

```text
src/features/[feature]/
├── [logic].ts                       # pure domain functions
├── [logic].test.ts                  # unit tests
├── queries.ts                       # database reads
├── actions.ts                       # Server Actions (authorization inside)
├── [name].integration.test.ts       # integration tests against local Supabase
└── components/                      # dumb views
src/app/[route]/page.tsx             # thin route wrapper
src/db/schema.ts                     # if the schema changes
supabase/migrations/                 # generated + reviewed SQL
```

## Schema & Migrations

[Tables/columns added or changed, constraints, RLS, triggers. Generated or custom migration.
"None" if the schema does not change.]

## Authorization & Visibility

[Who may call each action and see each view; embargo and spoiler implications
(constitution Principle VII).]

## Discord Touchpoints

[Messages, roles, channels, season sync changes. Copy in league voice. "None" if none.]

## Routes, Navigation & Staff Integration

[New or changed routes, their section (Liga / Spieler-Dashboard / Staff-Bereich) and row entry,
staffNav entries, staff todos, stream API impact.]

## Documentation Impact

[The CLAUDE.md map paragraph to add or update; legacy docs or older specs that need a backlink
note; constitution amendment if a cross-feature decision is made.]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., new dependency] | [current need] | [why the existing stack is insufficient] |

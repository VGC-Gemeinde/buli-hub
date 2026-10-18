# Implementation Plan: [FEATURE]

**Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  The stack is pinned by the constitution. Restate it as pinned there; fill only the
  feature-specific lines and mark unknowns NEEDS CLARIFICATION.
-->

**Stack**: [The constitution's pinned stack, restated]. New dependencies: [none |
name@exact-version, approved because ...]

**Testing**: [The test kinds the constitution requires, and which this feature adds]

**Target**: [Where it runs and for whom: deployment target, the widths and themes of the
Workflow profile's Mockup frame]

**Affected areas**: [Parts of the code layout this touches and why]

**Reused building blocks**: [Existing functions, data, components this builds on instead of
re-deriving them]

**Legacy context read**: [The Workflow profile's legacy documents and older specs consulted for
the existing behaviour this changes]

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
├── mockups/             # Approved in Gate 1 (/speckit-gemeinde-mockups)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

<!-- Replace with the concrete files this feature adds or changes, following the project's code
     layout (constitution, CLAUDE.md). -->

```text
[path]/[logic].ts            # pure domain functions
[path]/[logic].test.ts       # unit tests
[path]/...                   # views, routes, data access
```

## Data & Persistence

[What is stored or derived, and where; schema, file or format changes and how they migrate.
"None" if nothing changes.]

## Access & Visibility

[Who may do and see what; privacy, spoiler or embargo implications the constitution names.
"Public, read-only" if that is all.]

## External Touchpoints

[Other services, bots, APIs, sibling projects or data sources this reads or writes. "None" if
none.]

## Routes & Navigation

[New or changed routes, where they sit in the navigation, what is linkable.]

## Documentation Impact

[The Workflow profile's living documents to update (architecture map entry pointing at this spec);
legacy documents or older specs that need a backlink note; a constitution amendment if a
cross-feature decision is made.]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., new dependency] | [current need] | [why the existing stack is insufficient] |

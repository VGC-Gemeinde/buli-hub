# Contract: maintenance mode

Spec FR-018; page approved in `mockups/wartung.html`.

## Switch

Cloud Run environment variable `MAINTENANCE=on`. Setting or removing it with
`gcloud run services update <service> --update-env-vars MAINTENANCE=on` /
`--remove-env-vars MAINTENANCE` creates a new revision of the same image: no build, no release.
Any other value, or none, means off. Read once per request by the pure `maintenanceMode(env)`.

## Behavior while on

| Request | Response |
|---|---|
| `/impressum`, `/datenschutz` | the page as usual, rendered without touching the database |
| `/api/stream/**` | `503` JSON `{ "error": "maintenance" }`, `Retry-After: 3600` |
| `/api/jobs/**` | `503` JSON `{ "error": "maintenance" }`; Cloud Scheduler retries later |
| every other route, any method (pages, Server Actions, `/auth/**`, `/dev/**`) | `503` maintenance page, `Retry-After: 3600`, `Cache-Control: no-store` |
| static assets (`/_next/static`, images, fonts, icons) | served as usual, so the page renders |

- The proxy answers before any route code runs, so no Server Action, job or sign-in reaches the
  database.
- While on, the root layout renders neither the footer's signed-in parts nor the page-load
  counter: both read or write the database, and during the switch the database is being moved.
- No bypass, for nobody.

## Page

Static, as approved: accent line, header with logo and "Buli Hub", logo badge, kicker "Wartung",
h1 "Gleich wieder da", "Der Buli Hub wird gerade gewartet und ist für kurze Zeit nicht
erreichbar.", "Schau in etwa einer Stunde wieder vorbei.", "Neuigkeiten im Discord der VGC
Gemeinde →", footer with Impressum and Datenschutz. System theme, light and dark.

// Loads .env before any other module is evaluated. A script's own
// `process.loadEnvFile(".env")` runs too late for modules with import-time
// env guards (src/lib/db.ts throws without DATABASE_URL), because ES module
// imports are evaluated before the script body. Used via `--import`.
try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional; the variables may come from the environment.
}

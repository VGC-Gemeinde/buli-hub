// Vitest setup: load local env vars (DATABASE_URL etc.) for integration
// tests before test modules import the db client.
import { localDatabaseError } from "./local-database";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional; env vars may come from the environment (e.g. CI).
}

// Abort before any test module imports the db client — the integration tests
// clear tables on startup, so this is the last point at which a non-local
// DATABASE_URL can still be caught.
const error = localDatabaseError(
  process.env.DATABASE_URL,
  process.env.ALLOW_NONLOCAL_TEST_DATABASE === "true",
);
if (error) {
  throw new Error(`\n\n${error}\n`);
}

// Vitest setup: load local env vars (DATABASE_URL etc.) for integration
// tests before test modules import the db client.
try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional; env vars may come from the environment (e.g. CI).
}

// Where a stored team sheet lives. The sheet's id *is* the public slug, and a
// correction rewrites the row rather than creating a new one, so these URLs are
// stable for the life of the result.

export function pastePath(id: string): string {
  return `/pastes/${id}`;
}

// The absolute form, for anything leaving the app (Discord). Null when
// APP_BASE_URL is unset, which is the local default — the caller then omits the
// link rather than posting a relative one.
export function pasteUrl(id: string): string | null {
  const base = process.env.APP_BASE_URL;
  return base && base.length > 0
    ? `${base.replace(/\/+$/, "")}${pastePath(id)}`
    : null;
}

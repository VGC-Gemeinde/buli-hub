-- Defense-in-depth for the server-managed role columns: the PostgREST path
-- (role `authenticated`) may only write the user-editable settings columns.
-- Column-level grants require revoking the table-level privilege first —
-- a column REVOKE alone does not narrow a table-wide GRANT.

REVOKE INSERT, UPDATE ON "profiles" FROM authenticated;
REVOKE INSERT, UPDATE ON "profiles" FROM anon;

GRANT INSERT ("user_id", "twitter_handle", "bluesky_handle", "origin")
  ON "profiles" TO authenticated;
GRANT UPDATE ("twitter_handle", "bluesky_handle", "origin")
  ON "profiles" TO authenticated;

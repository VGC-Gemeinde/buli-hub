-- Custom migration: backfill schedule_published_at for seasons that ran before
-- the publish step existed. Generating the schedule used to publish it
-- instantly, so every window that already has matchdays is marked published,
-- dated to when its schedule was generated. Windows without a schedule stay
-- null and will go through the manual "Pairings veröffentlichen" step.
-- See docs/plans/schedule-publish.md.
update "registration_windows" w
set "schedule_published_at" = (
  select min(m."created_at")
  from "matchdays" m
  where m."window_id" = w."id"
)
where w."schedule_published_at" is null
  and exists (
    select 1 from "matchdays" m where m."window_id" = w."id"
  );

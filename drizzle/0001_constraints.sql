-- Everything the baseline cannot express in schema.ts (specs/004-google-cloud-migration,
-- research.md R6): every foreign key, the one-open-dispute index, the Discord-id check on bans,
-- and the trigger that keeps closed seasons final. Carried over one to one from the schema the
-- old migration chain built; the 29 keys that pointed at Supabase's auth.users now point at
-- users(id) with the same delete rules. No RLS, no grants: only the hub reaches the database.

ALTER TABLE "bans" ADD CONSTRAINT "bans_banned_by_id_fk" FOREIGN KEY (banned_by_id) REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "bans" ADD CONSTRAINT "bans_lifted_by_id_fk" FOREIGN KEY (lifted_by_id) REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "discord_posts" ADD CONSTRAINT "discord_posts_match_id_fk" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "discord_season_resources" ADD CONSTRAINT "discord_season_resources_sub_division_id_fk" FOREIGN KEY (sub_division_id) REFERENCES public.sub_divisions(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "discord_season_resources" ADD CONSTRAINT "discord_season_resources_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "discord_season_sync_state" ADD CONSTRAINT "discord_season_sync_state_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_match_id_fk" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_id_users_fk" FOREIGN KEY (opened_by_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_id_users_fk" FOREIGN KEY (resolved_by_id) REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_player_id_fk" FOREIGN KEY (player_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fk" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_reporter_id_users_fk" FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "match_games" ADD CONSTRAINT "match_games_match_id_fk" FOREIGN KEY (match_id) REFERENCES public.match_results(match_id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "match_games" ADD CONSTRAINT "match_games_winner_id_users_fk" FOREIGN KEY (winner_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_confirmed_by_id_users_fk" FOREIGN KEY (confirmed_by_id) REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_corrected_by_id_users_fk" FOREIGN KEY (corrected_by_id) REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_discussed_with_id_users_fk" FOREIGN KEY (discussed_with_id) REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_fk" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_reported_by_id_users_fk" FOREIGN KEY (reported_by_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_winner_id_users_fk" FOREIGN KEY (winner_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "matchdays" ADD CONSTRAINT "matchdays_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_a_id_users_fk" FOREIGN KEY (player_a_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_b_id_users_fk" FOREIGN KEY (player_b_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_sub_division_id_fk" FOREIGN KEY (sub_division_id) REFERENCES public.sub_divisions(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "motw_selections" ADD CONSTRAINT "motw_selections_match_id_fk" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "motw_selections" ADD CONSTRAINT "motw_selections_selected_by_id_users_fk" FOREIGN KEY (selected_by_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "motw_selections" ADD CONSTRAINT "motw_selections_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_division_id_fk" FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_dropped_by_id_users_fk" FOREIGN KEY (dropped_by_id) REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_late_dropped_by_id_fk" FOREIGN KEY (late_dropped_by_id) REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_sub_division_id_fk" FOREIGN KEY (sub_division_id) REFERENCES public.sub_divisions(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_user_id_users_fk" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_replacements" ADD CONSTRAINT "player_replacements_offered_by_id_fk" FOREIGN KEY (offered_by_id) REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "player_replacements" ADD CONSTRAINT "player_replacements_replaced_placement_fk" FOREIGN KEY (window_id, replaced_user_id) REFERENCES public.placements(window_id, user_id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_replacements" ADD CONSTRAINT "player_replacements_replacement_user_id_fk" FOREIGN KEY (replacement_user_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_replacements" ADD CONSTRAINT "player_replacements_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_fk" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recording_holds" ADD CONSTRAINT "recording_holds_held_by_id_fk" FOREIGN KEY (held_by_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recording_holds" ADD CONSTRAINT "recording_holds_match_id_fk" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recording_holds" ADD CONSTRAINT "recording_holds_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "regelwerk_acceptances" ADD CONSTRAINT "regelwerk_acceptances_user_id_users_fk" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "regelwerk_acceptances" ADD CONSTRAINT "regelwerk_acceptances_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "registration_windows" ADD CONSTRAINT "registration_windows_opened_by_users_fk" FOREIGN KEY (opened_by) REFERENCES public.users(id);--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_fk" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "seeding_locks" ADD CONSTRAINT "seeding_locks_holder_id_users_fk" FOREIGN KEY (holder_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "seeding_locks" ADD CONSTRAINT "seeding_locks_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "seedings" ADD CONSTRAINT "seedings_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sub_divisions" ADD CONSTRAINT "sub_divisions_division_id_fk" FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_sheets" ADD CONSTRAINT "team_sheets_match_id_match_results_fk" FOREIGN KEY (match_id) REFERENCES public.match_results(match_id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_sheets" ADD CONSTRAINT "team_sheets_player_id_users_fk" FOREIGN KEY (player_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tie_orders" ADD CONSTRAINT "tie_orders_decided_by_id_fk" FOREIGN KEY (decided_by_id) REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tie_orders" ADD CONSTRAINT "tie_orders_window_id_fk" FOREIGN KEY (window_id) REFERENCES public.registration_windows(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_fk" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bans" ADD CONSTRAINT "bans_discord_id_snowflake" CHECK ((discord_id ~ '^[0-9]{17,20}$'::text));--> statement-breakpoint
CREATE UNIQUE INDEX "disputes_one_open_per_match" ON "disputes" USING btree (match_id) WHERE (status = 'open'::public.dispute_status);--> statement-breakpoint
CREATE FUNCTION public.reject_closed_regular_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  target uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target := OLD.match_id;
  ELSE
    target := NEW.match_id;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "matches" m
    JOIN "registration_windows" w ON w.id = m.window_id
    WHERE m.id = target
      AND (
        w.season_completed_at IS NOT NULL
        OR (m.stage = 'regular' AND w.regular_season_closed_at IS NOT NULL)
      )
  ) THEN
    RAISE EXCEPTION 'results of match % are final', target
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER disputes_regular_lock BEFORE INSERT OR DELETE OR UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.reject_closed_regular_write();--> statement-breakpoint
CREATE TRIGGER match_games_regular_lock BEFORE INSERT OR DELETE OR UPDATE ON public.match_games FOR EACH ROW EXECUTE FUNCTION public.reject_closed_regular_write();--> statement-breakpoint
CREATE TRIGGER match_results_regular_lock BEFORE INSERT OR DELETE OR UPDATE ON public.match_results FOR EACH ROW EXECUTE FUNCTION public.reject_closed_regular_write();--> statement-breakpoint
CREATE TRIGGER team_sheets_regular_lock BEFORE INSERT OR DELETE OR UPDATE ON public.team_sheets FOR EACH ROW EXECUTE FUNCTION public.reject_closed_regular_write();

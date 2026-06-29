-- Remove the realtime alerts module (added 2026-05-13, retired 2026-06-29).
-- The feature was little-used and its every-2-min cron scan added load with
-- limited benefit. Drops all four alerts tables and the AlertConfigType enum.
-- AlertEvent has an FK onto AlertConfig (onDelete: Cascade) so order the
-- drops child-first, or just rely on CASCADE here.

DROP TABLE IF EXISTS "AlertEvent" CASCADE;
DROP TABLE IF EXISTS "AlertConfig" CASCADE;
DROP TABLE IF EXISTS "PushSubscription" CASCADE;
DROP TABLE IF EXISTS "UserAlertPreferences" CASCADE;

DROP TYPE IF EXISTS "AlertConfigType";

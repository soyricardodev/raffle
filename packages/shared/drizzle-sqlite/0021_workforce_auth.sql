ALTER TABLE users ADD COLUMN status text NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE session ADD COLUMN last_seen_at integer;
--> statement-breakpoint
CREATE TABLE staff_roles (id text PRIMARY KEY NOT NULL, name text NOT NULL, permissions text NOT NULL DEFAULT '[]', created_at integer NOT NULL);
--> statement-breakpoint
CREATE TABLE staff_grants (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, permission text NOT NULL, raffle_id integer REFERENCES raffles(id) ON DELETE CASCADE);
--> statement-breakpoint
CREATE INDEX staff_grants_user_idx ON staff_grants(user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX staff_grants_unique_idx ON staff_grants(user_id, permission, raffle_id);
--> statement-breakpoint
CREATE TABLE staff_invitations (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash text NOT NULL UNIQUE, expires_at integer NOT NULL, accepted_at integer, created_by text REFERENCES users(id) ON DELETE SET NULL, created_at integer NOT NULL);
--> statement-breakpoint
CREATE INDEX staff_invites_user_idx ON staff_invitations(user_id);
--> statement-breakpoint
CREATE TABLE staff_activity_days (user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, day text NOT NULL, active_seconds integer NOT NULL DEFAULT 0, PRIMARY KEY(user_id, day));
--> statement-breakpoint
CREATE INDEX audit_events_actor_created_idx ON audit_events(actor_user_id, created_at);

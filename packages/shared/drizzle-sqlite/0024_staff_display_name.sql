ALTER TABLE users ADD COLUMN display_name text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE users SET display_name = username;

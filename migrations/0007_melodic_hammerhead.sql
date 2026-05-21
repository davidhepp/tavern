DROP INDEX "game_file_download_file_user_idx";--> statement-breakpoint
ALTER TABLE "game_file_download" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "game_file_download" ADD COLUMN "user_agent" text;--> statement-breakpoint
CREATE INDEX "game_file_download_created_at_idx" ON "game_file_download" USING btree ("created_at");